import { DutchLimitOrderBuilder, DutchLimitOrderInfoJSON } from '@uniswap/gouda-sdk';
import { TradeType } from '@uniswap/sdk-core';
import { BigNumber, ethers } from 'ethers';

import { v4 as uuidv4 } from 'uuid';
import { Quote, QuoteJSON } from '.';
import { DutchLimitRequest } from '..';
import {
  GOUDA_BASE_GAS,
  HUNDRED_PERCENT,
  NATIVE_ADDRESS,
  RoutingType,
  WETH_UNWRAP_GAS,
  WETH_WRAP_GAS,
} from '../../constants';
import { currentTimestampInSeconds } from '../../util/time';
import { ClassicQuote } from './ClassicQuote';
import { LogJSON } from './index';

export type DutchLimitQuoteJSON = {
  chainId: number;
  requestId: string;
  quoteId: string;
  tokenIn: string;
  amountIn: string;
  tokenOut: string;
  amountOut: string;
  offerer: string;
  filler?: string;
};

export class DutchLimitQuote implements Quote {
  public routingType: RoutingType.DUTCH_LIMIT = RoutingType.DUTCH_LIMIT;
  // TODO: replace with better values
  // public static improvementExactIn = BigNumber.from(10100);
  // public static improvementExactOut = BigNumber.from(9900);
  public static improvementExactIn = BigNumber.from(10010);
  public static improvementExactOut = BigNumber.from(9990);
  public endAmountIn: BigNumber;
  public endAmountOut: BigNumber;

  public static fromResponseBody(
    request: DutchLimitRequest,
    body: DutchLimitQuoteJSON,
    nonce?: string
  ): DutchLimitQuote {
    return new DutchLimitQuote(
      currentTimestampInSeconds(),
      request,
      body.chainId,
      body.requestId,
      body.quoteId,
      body.tokenIn,
      BigNumber.from(body.amountIn),
      body.tokenOut,
      BigNumber.from(body.amountOut),
      body.offerer,
      body.filler,
      nonce
    );
  }

  constructor(
    public readonly createdAt: string,
    public readonly request: DutchLimitRequest,
    public readonly chainId: number,
    public readonly requestId: string,
    public readonly quoteId: string,
    public readonly tokenIn: string,
    public readonly amountIn: BigNumber,
    public readonly tokenOut: string,
    public readonly amountOut: BigNumber,
    public readonly offerer: string,
    public readonly filler?: string,
    public readonly nonce?: string
  ) {
    this.createdAt = createdAt || currentTimestampInSeconds();
    this.endAmountIn =
      request.info.type === TradeType.EXACT_INPUT ? this.amountIn : this.calculateEndAmountFromSlippage();
    this.endAmountOut =
      request.info.type === TradeType.EXACT_INPUT ? this.calculateEndAmountFromSlippage() : this.amountOut;
  }

  public static fromClassicQuote(request: DutchLimitRequest, quote: ClassicQuote): DutchLimitQuote {
    const { amountIn, amountOut } = applyGasAdjustment(quote);
    return new DutchLimitQuote(
      quote.createdAt,
      request,
      request.info.tokenInChainId,
      request.info.requestId,
      uuidv4(), // synthetic quote doesn't receive a quoteId from RFQ api, so generate one
      request.info.tokenIn,
      amountIn,
      quote.request.info.tokenOut,
      amountOut,
      request.config.offerer,
      '', // synthetic quote has no filler
      undefined // synthetic quote has no nonce
    );
  }

  public toJSON(): QuoteJSON {
    return {
      ...this.toOrder(),
      quoteId: this.quoteId,
    };
  }

  public toOrder(): DutchLimitOrderInfoJSON {
    const orderBuilder = new DutchLimitOrderBuilder(this.chainId);
    const startTime = Math.floor(Date.now() / 1000);
    const nonce = this.nonce ?? this.generateRandomNonce();
    const decayStartTime = startTime;

    const builder = orderBuilder
      .startTime(decayStartTime)
      .endTime(decayStartTime + this.request.config.auctionPeriodSecs)
      .deadline(decayStartTime + this.request.config.auctionPeriodSecs)
      .offerer(this.request.config.offerer)
      .nonce(BigNumber.from(nonce))
      .input({
        token: this.tokenIn,
        startAmount: this.amountIn,
        endAmount: this.endAmountIn,
      })
      .output({
        token: this.tokenOut,
        startAmount: this.amountOut,
        endAmount: this.endAmountOut,
        recipient: this.request.config.offerer,
      });

    if (this.filler) {
      builder.exclusiveFiller(this.filler, BigNumber.from(this.request.config.exclusivityOverrideBps));
    }

    const order = builder.build();

    return order.toJSON();
  }

  public toLog(): LogJSON {
    return {
      tokenInChainId: this.chainId,
      tokenOutChainId: this.chainId,
      requestId: this.requestId,
      quoteId: this.quoteId,
      tokenIn: this.tokenIn,
      tokenOut: this.tokenOut,
      amountIn: this.amountIn.toString(),
      amountOut: this.amountOut.toString(),
      endAmountIn: this.endAmountIn.toString(),
      endAmountOut: this.endAmountOut.toString(),
      amountInGasAdjusted: this.amountIn.toString(),
      amountOutGasAdjusted: this.amountOut.toString(),
      offerer: this.offerer,
      filler: this.filler,
      routing: RoutingType[this.routingType],
      slippage: this.request.info.slippageTolerance ? parseFloat(this.request.info.slippageTolerance) : -1,
      createdAt: this.createdAt,
    };
  }

  private calculateEndAmountFromSlippage(): BigNumber {
    if (this.request.info.type === TradeType.EXACT_INPUT) {
      return this.amountOut
        .mul(HUNDRED_PERCENT.sub(BigNumber.from(this.request.info.slippageTolerance)))
        .div(HUNDRED_PERCENT);
    } else {
      return this.amountIn
        .mul(HUNDRED_PERCENT.add(BigNumber.from(this.request.info.slippageTolerance)))
        .div(HUNDRED_PERCENT);
    }
  }

  private generateRandomNonce(): string {
    return ethers.BigNumber.from(ethers.utils.randomBytes(31)).shl(8).toString();
  }
}

// Calculates the gas adjustment for the given quote if processed through Gouda
export function applyGasAdjustment(classicQuote: ClassicQuote): { amountIn: BigNumber; amountOut: BigNumber } {
  const info = classicQuote.request.info;
  const gasAdjustment = getGasAdjustment(classicQuote);

  // get ratio of gas used to gas used with WETH wrap
  const gasUseEstimate = BigNumber.from(classicQuote.toJSON().gasUseEstimate);
  const gasUseRatio = gasUseEstimate.add(gasAdjustment).mul(100).div(gasUseEstimate);

  // multiply the original gasUseEstimate in quoteToken by the ratio
  const newGasUseEstimateQuote = BigNumber.from(classicQuote.toJSON().gasUseEstimateQuote).mul(gasUseRatio).div(100);

  if (info.type === TradeType.EXACT_INPUT) {
    const amountOut = newGasUseEstimateQuote.gt(classicQuote.amountOut)
      ? BigNumber.from(0)
      : classicQuote.amountOut.sub(newGasUseEstimateQuote).mul(DutchLimitQuote.improvementExactIn).div(HUNDRED_PERCENT);
    return {
      amountIn: info.amount,
      amountOut: amountOut.lt(0) ? BigNumber.from(0) : amountOut,
    };
  } else {
    return {
      amountIn: classicQuote.amountIn
        .add(newGasUseEstimateQuote)
        .mul(DutchLimitQuote.improvementExactOut)
        .div(HUNDRED_PERCENT),
      amountOut: info.amount,
    };
  }
}

// Returns the number of gas units extra required to execute this quote through Gouda
export function getGasAdjustment(classicQuote: ClassicQuote): BigNumber {
  const wethAdjustment = getWETHGasAdjustment(classicQuote);
  return wethAdjustment.add(GOUDA_BASE_GAS);
}

// Returns the number of gas units to wrap ETH if required
export function getWETHGasAdjustment(quote: ClassicQuote): BigNumber {
  const info = quote.request.info;
  let result = BigNumber.from(0);

  // gouda does not naturally support ETH input, but user still has to wrap it
  // so should be considered in the quote pricing
  if (info.tokenIn === NATIVE_ADDRESS) {
    result = result.add(WETH_WRAP_GAS);
  }

  // fill contract must unwrap WETH output tokens
  if (info.tokenOut === NATIVE_ADDRESS) {
    result = result.add(WETH_UNWRAP_GAS);
  }

  return result;
}
