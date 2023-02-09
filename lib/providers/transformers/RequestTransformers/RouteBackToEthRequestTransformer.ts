import { Protocol } from '@uniswap/router-sdk';
import { TradeType } from '@uniswap/sdk-core';
import { ID_TO_CHAIN_ID, WRAPPED_NATIVE_CURRENCY } from '@uniswap/smart-order-router';
import Logger from 'bunyan';
import { parseEther } from 'ethers/lib/utils';

import { RequestTransformer } from '..';
import { QuoteRequest } from '../../../entities';
import { ClassicRequest } from '../../../entities/request/ClassicRequest';
import { RequestByRoutingType, RoutingType } from '../../../entities/request/index';

/*
 * adds a synthetic classic request to check if the output token has route back to ETH
 */
export class RouteBackToEthTransformer implements RequestTransformer {
  private log: Logger;

  constructor(_log: Logger) {
    this.log = _log.child({ quoter: 'RouteBackToEthTransformer' });
  }
  transform(requests: QuoteRequest[], gasPriceWei: string): QuoteRequest[] {
    const requestByRoutingType: RequestByRoutingType = {};
    requests.forEach((r) => (requestByRoutingType[r.routingType] = r));

    if (!requestByRoutingType[RoutingType.DUTCH_LIMIT]) {
      this.log.info('UniswapX not requested, skipping transformer');
      return requests;
    }

    const synthClassicRequest = new ClassicRequest(
      {
        ...requests[0].info,
        type: TradeType.EXACT_OUTPUT,
        tokenIn: requests[0].info.tokenOut,
        amount: parseEther('1'),
        tokenOut: WRAPPED_NATIVE_CURRENCY[ID_TO_CHAIN_ID(requests[0].info.tokenOutChainId)].address,
      },
      {
        protocols: [Protocol.MIXED, Protocol.V2, Protocol.V3],
        gasPriceWei: gasPriceWei,
      }
    );
    this.log.info({ synthClassicRequest: synthClassicRequest });
    return [...requests, synthClassicRequest];
  }
}
