# Deep `freeze`, `seal` or `preventExtensions` with typescript types

Usage:

1. Install package `yarn add @tanzanite/deep-lock`
2. Usage:

```ts
import deepLock from '@tanzanite/deep-lock';

const obj = { x: 1 }; // { x: number }
const freezed = deepLock({ x: 1 }); // { readonly x: number }
```
