import { EventEmitter } from 'events';
import { v4 } from 'uuid';
import { pipe } from 'fp-ts/lib/function';
import { fold } from 'fp-ts/lib/Either';
import { Response } from './Response';

export interface Gate extends EventEmitter {
  new(iframe: HTMLIFrameElement): this;
  readonly call: Gate.CallFunction;
  emit(event: 'message', data: unknown): boolean;
  on(event: 'message', listener: Gate.MessageListener): this;
}

export class Gate extends EventEmitter implements Gate {

  private readonly contentWindow: WindowProxy;

  public constructor(contentWindow: WindowProxy) {
    super();
    this.contentWindow = contentWindow;
    window.addEventListener('message', (event: MessageEvent): void => {
      if (event.source === this.contentWindow) {
        this.emit('message', event.data);
      }
    });
  }

  public readonly call: Gate.CallFunction = async (descriptor: Gate.Descriptor): Promise<unknown> => {
    return new Promise<unknown>((resolve, reject): void => {
      try {
        const requestId: string = v4();
        const timeout: NodeJS.Timeout = setTimeout((): void => {
          window.removeEventListener('message', onMessage);
          reject(new Error('Gateway timeout'));
        }, 30000);
        const onMessage = (event: MessageEvent<Response>): void => {
          if (event.source === this.contentWindow) {
            pipe(
              Response.decode(event.data),
              fold(
                (): void => {},
                (data: Response): void => {
                  if (data.id === requestId && data.type === 'response') {
                    clearTimeout(timeout);
                    window.removeEventListener('message', onMessage);
                    resolve(data.return);
                  }
                },
              )
            )
          }
        };

        window.addEventListener('message', onMessage);
        this.contentWindow.postMessage({
          id: requestId,
          type: 'request',
          function: descriptor.function,
          parameters: descriptor.parameters,
        }, '*');
      } catch (error) {
        reject(error);
      }
    });
  };

}

export namespace Gate {
  export interface Descriptor {
    function: string;
    parameters: Record<string, unknown>;
  }

  export type CallFunction = (descriptor: Gate.Descriptor) => Promise<unknown>;
  export type MessageListener = (data: unknown) => Promise<void> | void;
}
