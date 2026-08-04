import 'react';

declare module 'react' {
  interface Attributes {
    key?: string | number | null;
  }

  interface Component<P = {}, S = {}, SS = any> {
    readonly props: Readonly<P>;
  }
}
