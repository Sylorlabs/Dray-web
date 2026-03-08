describe('logger', () => {
  const origEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = origEnv;
    jest.restoreAllMocks();
    jest.resetModules();
  });

  test('error always logs regardless of environment', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation();
    process.env.NODE_ENV = 'production';
    jest.resetModules();
    const { logger } = require('../src/lib/logger');
    logger.error('test error');
    expect(spy).toHaveBeenCalledWith('test error');
  });

  test('debug does not log in production', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation();
    process.env.NODE_ENV = 'production';
    jest.resetModules();
    const { logger } = require('../src/lib/logger');
    logger.debug('test debug');
    expect(spy).not.toHaveBeenCalled();
  });

  test('warn does not log in production', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation();
    process.env.NODE_ENV = 'production';
    jest.resetModules();
    const { logger } = require('../src/lib/logger');
    logger.warn('test warn');
    expect(spy).not.toHaveBeenCalled();
  });

  test('info does not log in production', () => {
    const spy = jest.spyOn(console, 'info').mockImplementation();
    process.env.NODE_ENV = 'production';
    jest.resetModules();
    const { logger } = require('../src/lib/logger');
    logger.info('test info');
    expect(spy).not.toHaveBeenCalled();
  });

  test('debug logs in development', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation();
    process.env.NODE_ENV = 'development';
    jest.resetModules();
    const { logger } = require('../src/lib/logger');
    logger.debug('test debug');
    expect(spy).toHaveBeenCalledWith('test debug');
  });

  test('warn logs in development', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation();
    process.env.NODE_ENV = 'development';
    jest.resetModules();
    const { logger } = require('../src/lib/logger');
    logger.warn('test warn');
    expect(spy).toHaveBeenCalledWith('test warn');
  });

  test('info logs in development', () => {
    const spy = jest.spyOn(console, 'info').mockImplementation();
    process.env.NODE_ENV = 'development';
    jest.resetModules();
    const { logger } = require('../src/lib/logger');
    logger.info('test info');
    expect(spy).toHaveBeenCalledWith('test info');
  });

  test('error logs multiple arguments', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation();
    process.env.NODE_ENV = 'production';
    jest.resetModules();
    const { logger } = require('../src/lib/logger');
    logger.error('error', 42, { detail: 'info' });
    expect(spy).toHaveBeenCalledWith('error', 42, { detail: 'info' });
  });
});
