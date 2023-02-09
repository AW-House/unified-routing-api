import { PostQuoteRequestBodyJoi } from '../../../../lib/handlers/quote';
import { FieldValidator } from '../../../../lib/util/validator';
import {
  AMOUNT_IN,
  CHAIN_IN_ID,
  CHAIN_OUT_ID,
  CLASSIC_CONFIG,
  DL_CONFIG,
  TOKEN_IN,
  TOKEN_OUT,
} from '../../../constants';

const DL_CONFIG_JSON = {
  ...DL_CONFIG,
  routingType: 'DUTCH_LIMIT',
};

const CLASSIC_CONFIG_JSON = {
  ...CLASSIC_CONFIG,
  routingType: 'CLASSIC',
};

const BASE_REQUEST_BODY = {
  tokenInChainId: CHAIN_IN_ID,
  tokenOutChainId: CHAIN_OUT_ID,
  tokenIn: TOKEN_IN,
  tokenOut: TOKEN_OUT,
  amount: AMOUNT_IN,
  type: 'EXACT_INPUT',
  configs: [DL_CONFIG_JSON, CLASSIC_CONFIG_JSON],
};

describe('Post quote request validation', () => {
  describe('config validation', () => {
    it('should validate dutch limit config', () => {
      const { error } = FieldValidator.dutchLimitConfig.validate(DL_CONFIG_JSON);
      expect(error).toBeUndefined();
    });

    it('should reject invalid routingType', () => {
      const { error } = FieldValidator.dutchLimitConfig.validate({
        ...DL_CONFIG_JSON,
        routingType: 'INVALID',
      });
      expect(error).toBeDefined();
    });

    it('should reject invalid slippage', () => {
      const { error } = FieldValidator.dutchLimitConfig.validate({
        ...DL_CONFIG_JSON,
        slippage: -1,
      });
      expect(error).toBeDefined();
    });

    it('should reject invalid deadline', () => {
      const { error } = FieldValidator.dutchLimitConfig.validate({
        ...DL_CONFIG_JSON,
        deadline: -1,
      });
      expect(error).toBeDefined();
    });

    it('should reject invalid recipient', () => {
      const { error } = FieldValidator.dutchLimitConfig.validate({
        ...DL_CONFIG_JSON,
        recipient: '0x',
      });
      expect(error).toBeDefined();
    });

    it('should validate classic config', () => {
      const { error } = FieldValidator.classicConfig.validate(CLASSIC_CONFIG_JSON);
      expect(error).toBeUndefined();
    });

    it('should reject invalid protocols', () => {
      const { error } = FieldValidator.classicConfig.validate({
        ...CLASSIC_CONFIG_JSON,
        protocols: ['INVALID'],
      });
      expect(error).toBeDefined();
    });

    it('should reject invalid gasPriceWei', () => {
      const { error } = FieldValidator.classicConfig.validate({
        ...CLASSIC_CONFIG_JSON,
        gasPriceWei: '-1',
      });
      expect(error).toBeDefined();
    });

    it('should reject invalid simulateFromAddress', () => {
      const { error } = FieldValidator.classicConfig.validate({
        ...CLASSIC_CONFIG_JSON,
        simulateFromAddress: '0x',
      });
      expect(error).toBeDefined();
    });

    it('should reject invalid permitExpiration', () => {
      const { error } = FieldValidator.classicConfig.validate({
        ...CLASSIC_CONFIG_JSON,
        permitExpiration: -1,
      });
      expect(error).toBeDefined();
    });

    it('should reject invalid permitAmount', () => {
      const { error } = FieldValidator.classicConfig.validate({
        ...CLASSIC_CONFIG_JSON,
        permitAmount: '-1',
      });
      expect(error).toBeDefined();
    });

    it('should reject invalid permitSigDeadline', () => {
      const { error } = FieldValidator.classicConfig.validate({
        ...CLASSIC_CONFIG_JSON,
        permitSigDeadline: -1,
      });
      expect(error).toBeDefined();
    });

    it('should reject invalid deadline', () => {
      const { error } = FieldValidator.classicConfig.validate({
        ...CLASSIC_CONFIG_JSON,
        deadline: 20000,
      });
      expect(error).toBeDefined();
    });

    it('should reject invalid minSplits', () => {
      const { error } = FieldValidator.classicConfig.validate({
        ...CLASSIC_CONFIG_JSON,
        minSplits: 8,
      });
      expect(error).toBeDefined();
    });
  });

  it('should validate a complete request', () => {
    const { error } = PostQuoteRequestBodyJoi.validate(BASE_REQUEST_BODY);
    expect(error).toBeUndefined();
  });

  it('should reject invalid tokenInChainId', () => {
    const { error } = PostQuoteRequestBodyJoi.validate({
      ...BASE_REQUEST_BODY,
      tokenInChainId: 0,
    });
    expect(error).toBeDefined();
  });

  it('should reject invalid tokenOutChainId', () => {
    const { error } = PostQuoteRequestBodyJoi.validate({
      ...BASE_REQUEST_BODY,
      tokenOutChainId: 0,
    });
    expect(error).toBeDefined();
  });

  it('should reject invalid tokenIn', () => {
    const { error } = PostQuoteRequestBodyJoi.validate({
      ...BASE_REQUEST_BODY,
      tokenIn: '0x',
    });
    expect(error).toBeDefined();
  });

  it('should reject invalid tokenOut', () => {
    const { error } = PostQuoteRequestBodyJoi.validate({
      ...BASE_REQUEST_BODY,
      tokenOut: '0x',
    });
    expect(error).toBeDefined();
  });

  it('should reject invalid amount', () => {
    const { error } = PostQuoteRequestBodyJoi.validate({
      ...BASE_REQUEST_BODY,
      amount: '-1',
    });
    expect(error).toBeDefined();
  });

  it('should reject invalid type', () => {
    const { error } = PostQuoteRequestBodyJoi.validate({
      ...BASE_REQUEST_BODY,
      type: 'INVALID',
    });
    expect(error).toBeDefined();
  });
});