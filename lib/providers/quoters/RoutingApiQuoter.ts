import { TradeType } from '@uniswap/sdk-core';
import axios from 'axios';
import Logger from 'bunyan';
import querystring from 'querystring';

import { ClassicQuote, ClassicRequest, Quote, RoutingType } from '../../entities';
import { Quoter, QuoterType } from './index';

export class RoutingApiQuoter implements Quoter {
  static readonly type: QuoterType.ROUTING_API;
  private log: Logger;

  constructor(_log: Logger, private routingApiUrl: string) {
    this.log = _log.child({ quoter: 'RoutingApiQuoter' });
  }

  async quote(request: ClassicRequest): Promise<Quote | null> {
    this.log.info(request, 'quoteRequest');
    this.log.info(this.routingApiUrl, 'routingApiUrl');

    if (request.routingType !== RoutingType.CLASSIC) {
      throw new Error(`Invalid routing config type: ${request.routingType}`);
    }
    try {
      const req = this.buildRequest(request);
      this.log.info(req, 'routingApiReq');
      const response = await axios.get(req);
      return ClassicQuote.fromResponseBody(request, response.data);
    } catch (e) {
      this.log.error(e, 'RoutingApiQuoterErr');
      return null;
    }
  }

  buildRequest(request: ClassicRequest): string {
    const tradeType = request.info.type === TradeType.EXACT_INPUT ? 'exactIn' : 'exactOut';
    const config = request.config;
    return (
      this.routingApiUrl +
      'quote?' +
      querystring.stringify({
        tokenInAddress: request.info.tokenIn,
        tokenInChainId: request.info.tokenInChainId,
        tokenOutAddress: request.info.tokenOut,
        tokenOutChainId: request.info.tokenOutChainId,
        amount: request.info.amount.toString(),
        type: tradeType,
        gasPriceWei: config.gasPriceWei,
        ...(config.protocols.length && { protocols: config.protocols.map((p) => p.toLowerCase()).join(',') }),
        ...(config.slippageTolerance !== undefined && { slippageTolerance: config.slippageTolerance }),
        ...(config.minSplits !== undefined && { minSplits: config.minSplits }),
        ...(config.forceCrossProtocol !== undefined && { forceCrossProtocol: config.forceCrossProtocol }),
        ...(config.forceMixedRoutes !== undefined && { forceMixedRoutes: config.forceMixedRoutes }),
        ...(config.deadline !== undefined && { deadline: config.deadline }),
        ...(config.simulateFromAddress !== undefined && { simulateFromAddress: config.simulateFromAddress }),
        ...(config.permitSignature !== undefined && { permitSignature: config.permitSignature }),
        ...(config.permitNonce !== undefined && { permitNonce: config.permitNonce }),
        ...(config.permitExpiration !== undefined && { permitExpiration: config.permitExpiration }),
        ...(config.permitAmount !== undefined && { permitAmount: config.permitAmount.toString() }),
        ...(config.permitSigDeadline !== undefined && { permitSigDeadline: config.permitSigDeadline }),
        ...(config.enableUniversalRouter !== undefined && { enableUniversalRouter: config.enableUniversalRouter }),
      })
    );
  }
}