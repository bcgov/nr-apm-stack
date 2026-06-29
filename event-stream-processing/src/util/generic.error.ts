/* istanbul ignore file */

import { ExtendedError } from './extended.error';

export class GenericError extends ExtendedError {
  constructor(
    message: string,
    public source?: Error | undefined,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    if (source) {
      // this.stack_before_rethrow = this.stack
      const messageLines = (this.message.match(/\n/g) || []).length + 1;

      this.stack =
        this.stack
          ?.split('\n')
          .slice(0, messageLines + 1)
          .join('\n') +
        '\n' +
        (source ? source.stack : '');
    }
  }
}
