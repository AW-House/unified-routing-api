import { BigNumber, ethers } from 'ethers';
import Joi, { CustomHelpers } from 'joi';

import { SUPPORTED_CHAINS } from '../config/chains';

export class FieldValidator {
  public static readonly address = Joi.string().custom((value: string, helpers: CustomHelpers<string>) => {
    if (!ethers.utils.isAddress(value)) {
      return helpers.message({ custom: 'Invalid address' });
    }
    return ethers.utils.getAddress(value);
  });

  public static readonly amount = Joi.string().custom((value: string, helpers: CustomHelpers<string>) => {
    try {
      const result = BigNumber.from(value);
      if (result.lt(0)) {
        return helpers.message({ custom: 'Invalid amount: negative number' });
      } else if (result.gt(ethers.constants.MaxUint256)) {
        return helpers.message({ custom: 'Invalid amount: larger than UINT256_MAX' });
      }
    } catch {
      // bignumber error is a little ugly for API response so rethrow our own
      return helpers.message({ custom: 'Invalid amount' });
    }
    return value;
  });

  public static readonly classicChainId = Joi.number()
    .integer()
    .valid(...SUPPORTED_CHAINS.CLASSIC);

  public static readonly dutchLimitChainId = Joi.number()
    .integer()
    .valid(...SUPPORTED_CHAINS.DUTCH_LIMIT);

  public static readonly tradeType = Joi.string().valid('EXACT_INPUT', 'EXACT_OUTPUT');

  public static readonly routingType = Joi.string().valid('CLASSIC', 'DUTCH_LIMIT');

  public static readonly protocol = Joi.string().valid('V2', 'V3', 'MIXED');

  public static readonly protocols = Joi.array().items(FieldValidator.protocol);

  public static readonly gasPriceWei = Joi.string()
    .pattern(/^[0-9]+$/)
    .max(30);

  public static readonly permitSignature = Joi.string();

  public static readonly permitNonce = Joi.string();

  public static readonly enableUniversalRouter = Joi.boolean();

  public static readonly slippageTolerance = Joi.number().min(0).max(200); // 20% in 1000 FIXED POINT

  public static readonly deadline = Joi.number().greater(0).max(10800); // 180 mins, same as interface max;

  public static readonly minSplits = Joi.number().max(7);

  public static readonly forceCrossProtocol = Joi.boolean();

  public static readonly forceMixedRoutes = Joi.boolean();

  public static readonly positiveNumber = Joi.number().greater(0);

  public static readonly classicConfig = Joi.object({
    routingType: FieldValidator.routingType.required(),
    protocols: FieldValidator.protocols.required(),
    gasPriceWei: FieldValidator.gasPriceWei.optional(),
    simulateFromAddress: FieldValidator.address.optional(),
    permitSignature: FieldValidator.permitSignature.optional(),
    permitNonce: FieldValidator.permitNonce.optional(),
    permitExpiration: FieldValidator.positiveNumber.optional(),
    permitAmount: FieldValidator.amount.optional(),
    permitSigDeadline: FieldValidator.positiveNumber.optional(),
    enableUniversalRouter: FieldValidator.enableUniversalRouter.optional(),
    deadline: FieldValidator.deadline.optional(),
    minSplits: FieldValidator.minSplits.optional(),
    forceCrossProtocol: FieldValidator.forceCrossProtocol.optional(),
    forceMixedRoutes: FieldValidator.forceMixedRoutes.optional(),
    slippageTolerance: FieldValidator.slippageTolerance.optional(),
  });

  public static readonly dutchLimitConfig = Joi.object({
    routingType: FieldValidator.routingType.required(),
    offerer: FieldValidator.address.optional(),
    exclusivePeriodSecs: FieldValidator.positiveNumber.optional(),
    auctionPeriodSecs: FieldValidator.positiveNumber.optional(),
    slippageTolerance: FieldValidator.slippageTolerance.optional(),
  });
}