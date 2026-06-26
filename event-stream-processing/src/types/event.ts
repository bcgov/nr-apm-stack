export interface Event {
  kind: string;
  category: string;
  dataset: string;
  hash: string;
  /**
   * Raw text message of entire event. Used to demonstrate log integrity.
   * If provided as an object, it will be stringfied.
   * @see {@link https://www.elastic.co/guide/en/ecs/current/ecs-event.html#field-event-original}
   */

  original: string | any;
}
