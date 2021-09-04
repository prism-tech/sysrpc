import * as T from 'io-ts';

export const Response = T.interface({
  id: T.string,
  type: T.literal('response'),
  return: T.unknown,
});

export type Response = T.TypeOf<typeof Response>;
