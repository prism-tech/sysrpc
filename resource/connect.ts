import { Gate } from './Gate';

type LoadListener = (event: Event) => void;
type ErrorListener = (event: ErrorEvent) => void;

export async function connect(src: string): Promise<Gate> {
  return new Promise<Gate>((resolve, reject): void => {
    try {
      const iframe: HTMLIFrameElement = document.createElement('iframe');
      const timeout: NodeJS.Timeout = setTimeout((): void => {
        iframe.removeEventListener('load', onLoad);
        iframe.removeEventListener('error', onError);
        reject(new Error('Gateway timeout'));
      }, 30000);
      const onLoad: LoadListener = (): void => {
        clearTimeout(timeout);
        iframe.removeEventListener('load', onLoad);
        iframe.removeEventListener('error', onError);
        try {
          if (iframe.contentWindow === null) {
            reject(new Error(''));
          } else {
            resolve(new Gate(iframe.contentWindow));
          }
        } catch (error) {
          reject(error);
        }
      };
      const onError: ErrorListener = (event: ErrorEvent): void => {
        clearTimeout(timeout);
        iframe.removeEventListener('load', onLoad);
        iframe.removeEventListener('error', onError);
        reject(event.error);
      };

      iframe.addEventListener('load', onLoad);
      iframe.addEventListener('error', onError);
      iframe.src = src;

      document.body.appendChild(iframe);
    } catch (error) {
      reject(error);
    }
  });
}
