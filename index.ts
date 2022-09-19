// types from https://github.com/krzkaczor/ts-essentials

type Primitive = string | number | boolean | bigint | symbol | undefined | null;
type Builtin = Primitive | Function | Date | Error | RegExp;
type IsAny<T> = 0 extends 1 & T ? true : false;
type IsUnknown<T> = IsAny<T> extends true ? false : unknown extends T ? true : false;

type DeepReadonly<T> = T extends Builtin
	? T
	: T extends Map<infer K, infer V>
	? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
	: T extends ReadonlyMap<infer K, infer V>
	? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
	: T extends WeakMap<infer K, infer V>
	? WeakMap<DeepReadonly<K>, DeepReadonly<V>>
	: T extends Set<infer U>
	? ReadonlySet<DeepReadonly<U>>
	: T extends ReadonlySet<infer U>
	? ReadonlySet<DeepReadonly<U>>
	: T extends WeakSet<infer U>
	? WeakSet<DeepReadonly<U>>
	: T extends Promise<infer U>
	? Promise<DeepReadonly<U>>
	: T extends {}
	? { readonly [K in keyof T]: DeepReadonly<T[K]> }
	: IsUnknown<T> extends true
	? unknown
	: Readonly<T>;

type Actions = 'freeze' | 'seal' | 'preventExtensions';

/**
 * Recursively apply provided options operations on object
 * and all of the object properties that are either object or function.
 *
 * By default freezes object.
 *
 * @param obj - The object to which will be applied `freeze`, `seal` or `preventExtensions`
 * @param options default `{ action: 'freeze' }`
 * @param options.action
 * ```
 * | action            | Add | Modify | Delete | Reconfigure |
 * | ----------------- | --- | ------ | ------ | ----------- |
 * | preventExtensions |  -  |   +    |   +    |      +      |
 * | seal              |  -  |   +    |   -    |      -      |
 * | freeze            |  -  |   -    |   -    |      -      |
 * ```
 *
 * @returns {Object} Initial object with applied options action
 */
export function deepLock<T extends Record<any, any>>(obj: T): DeepReadonly<T>;
export function deepLock<T extends Record<any, any>, Action extends Actions>(
	obj: T,
	options: { action?: Action }
): 'freeze' extends Action ? DeepReadonly<T> : T;
export function deepLock(obj: Record<any, any>, options?: { action?: Actions }) {
	const { action = 'freeze' } = options ?? {};

	if (!['freeze', 'seal', 'preventExtensions', 'preventExtensions'].includes(action)) {
		throw new TypeError(`Invalid action: ${action}`);
	}

	return lock(obj, action);
}

function lock(obj: Record<any, any>, action: Actions, locked = new Set()) {
	if (locked.has(obj)) return obj; // Prevent circular reference

	// @ts-ignore incompatible type signatures
	Object[action](obj);
	locked.add(obj);

	// In strict mode obj.caller and obj.arguments are non-deletable properties which throw when set or retrieved
	if (obj === Function.prototype) return obj;

	const keys: (string | symbol)[] = Object.getOwnPropertyNames(obj);
	keys.push(...Object.getOwnPropertySymbols(obj));

	keys.forEach((prop) => {
		if (
			Object.hasOwnProperty.call(obj, prop) &&
			obj[<any>prop] !== null &&
			(typeof obj[<any>prop] === 'object' || typeof obj[<any>prop] === 'function') &&
			!ArrayBuffer.isView(obj[<any>prop])
		) {
			lock(obj[<any>prop], action, locked);
		}
	});

	return obj;
}

export default deepLock;
