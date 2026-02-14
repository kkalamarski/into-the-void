const { esbuildDecorators } = require('@anatine/esbuild-decorators');

module.exports = {
  sourcemap: true,
  outExtension: { '.js': '.js' },
  external: [
    '@nestjs/microservices',
    '@nestjs/websockets',
    'class-transformer',
    'class-validator',
    '@mapbox/node-pre-gyp',
    'mock-aws-s3',
    'aws-sdk',
    'nock',
    'bcrypt',
  ],
  plugins: [
    esbuildDecorators({
      tsconfig: './apps/api/tsconfig.app.json',
    }),
  ],
};
