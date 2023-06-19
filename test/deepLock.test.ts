import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import deepLock from '../src/deepLock.js';

// Credits for some test https://github.com/snovakovic/js-flock

describe('deepLock', () => {
	const beforeEach = () => {
		obj = {
			p1: {
				p2: { p3: { num: 1 } }
			}
		};

		refToA = { p1: 'a' };
		refToB = { p2: 'b' };

		refToB.refToObjA = refToA;
		refToA.refToObjB = refToB;

		const ob1 = { proto: { p: { is: 'obj1' } } };
		const ob2 = Object.create(ob1);
		ob2.p = { is: 'ob2.p' };
		prot = Object.create(ob2);
		prot.child = { is: 'prot.child' };
		prot.fn = () => {};
	};

	const regExpNotExt = /Cannot add property .* object is not extensible/;

	let obj: any;
	let refToA: any;
	let refToB: any;
	let prot: any;

	describe('freeze', () => {
		it('Should handle missing options', () => {
			beforeEach();

			const obj = {};
			deepLock(obj);
			assert.equal(Object.isFrozen(obj), true);

			const obj2 = {};
			deepLock(obj2, {});
			assert.equal(Object.isFrozen(obj2), true);
		});

		it('Should throw for invalid action', () => {
			beforeEach();

			assert.throws(() => deepLock(obj, { action: 'a' as any }), /Invalid action: /);
		});

		it('Should freeze and not throw on any types', () => {
			beforeEach();

			const obj = {
				num: 1,
				bigNum: BigInt(1),
				sym: Symbol('desc'),
				subObj: { sub: 1 },
				fn: function () {},
				buff: new ArrayBuffer(16),
				bool: true,
				nullable: null,
				undf: undefined,
				arr: [1, 2, 3, 4],
				arrObj: [{ x: 1 }],
				inf: Infinity,
				nan: NaN,
				dob: new Date(),
				set: new Set([{ p1: { p2: 1 } }])
			} as any;

			obj.fn.p1 = { p2: 2 };
			obj.set.p1 = { p2: 2 };

			deepLock(obj);
			assert.equal(Object.isFrozen(obj), true);
			assert.equal(Object.isFrozen(obj.num), true);
			assert.equal(Object.isFrozen(obj.subObj.sub), true);
			assert.equal(Object.isFrozen(obj.fn.p1.p2), true);
			assert.equal(Object.isFrozen(obj.arrObj[0].x), true);
			assert.equal(Object.isFrozen(obj.set.p1.p2), true);

			assert.throws(() => (obj.x = 1), regExpNotExt);
		});

		it('Should freeze object without prototype', () => {
			beforeEach();

			const obj = Object.create(null);
			obj.x = 1;
			obj.obj2 = Object.create(null);
			assert.equal(Object.isFrozen(obj), false);

			deepLock(obj);
			assert.equal(Object.isFrozen(obj), true);
			assert.equal(Object.isFrozen(obj.x), true);
			assert.equal(Object.isFrozen(obj.obj2), true);

			assert.throws(() => (obj.y = 1), regExpNotExt);
		});

		it('Should deep freeze nested objects', () => {
			beforeEach();

			deepLock(obj);
			assert.equal(Object.isFrozen(obj.p1.p2), true);
			assert.equal(Object.isFrozen(obj.p1.p2.p3), true);
			assert.equal(Object.isFrozen(obj.p1.p2.p3.fn), true);
		});

		it('Should freeze circular reference once', () => {
			beforeEach();

			deepLock(refToA);
			assert.equal(Object.isFrozen(refToA.p1), true);
			assert.equal(Object.isFrozen(refToA.refToObjB), true);
			assert.equal(Object.isFrozen(refToA.refToObjB.p2), true);
		});

		it('Should not freeze prototype chain', () => {
			beforeEach();

			deepLock(prot);
			assert.equal(Object.isFrozen(prot), true);
			assert.equal(Object.isFrozen(prot.child), true);
			assert.equal(Object.isFrozen(prot.fn), true);
			assert.equal(Object.isFrozen(prot.p), false);
			assert.equal(Object.isFrozen(prot.proto.p), false);
		});

		it('Should handle restricted properties', () => {
			beforeEach();

			const fn = function () {};
			const fnProt = Object.getPrototypeOf(fn);
			deepLock(fnProt);
			assert.equal(Object.isFrozen(fnProt), true);
		});

		it('Should deep freeze non enumerable properties', () => {
			beforeEach();

			Object.defineProperty(obj, 'nonEnumerable', {
				enumerable: false,
				value: {}
			});

			deepLock(obj);
			assert.equal(Object.isFrozen(obj.nonEnumerable), true);
		});

		it('Should freeze object with Symbol property', () => {
			beforeEach();

			const sim = Symbol('test');
			obj[sim] = {
				key: { test: 1 }
			};

			deepLock(obj);
			assert.equal(Object.isFrozen(obj[sim].key), true);
		});

		it('Should not break for TypedArray properties', () => {
			beforeEach();

			obj.typedArray = new Uint32Array(4);
			obj.buffer = Buffer.from('TEST');

			deepLock(obj);
			assert.equal(Object.isFrozen(obj), true);
		});

		it('Should deep freeze children of already frozen object', () => {
			beforeEach();

			Object.freeze(obj.p1);

			deepLock(obj);
			assert.equal(Object.isFrozen(obj.p1.p2), true);
			assert.equal(Object.isFrozen(obj.p1.p2.p3), true);
		});

		it('Should not freeze object prototype', () => {
			beforeEach();

			deepLock(prot);
			assert.equal(Object.isFrozen(prot), true);
			assert.equal(Object.isFrozen(Object.getPrototypeOf(prot)), false);
		});
	});

	describe('seal', () => {
		it('Should deep seal nested objects', () => {
			beforeEach();

			deepLock(obj, { action: 'seal' });
			assert.equal(Object.isSealed(obj.p1.p2), true);
			assert.equal(Object.isSealed(obj.p1.p2.p3), true);
			assert.equal(Object.isSealed(obj.p1.p2.p3.fn), true);
		});

		it('Should handle circular reference', () => {
			beforeEach();

			deepLock(refToA);
			assert.equal(Object.isSealed(refToA.p1), true);
			assert.equal(Object.isSealed(refToA.refToObjB), true);
			assert.equal(Object.isSealed(refToA.refToObjB.p2), true);
		});
	});

	describe('preventExtensions', () => {
		it('Should deep prevent extension', () => {
			beforeEach();

			deepLock(obj, { action: 'preventExtensions' });
			assert.equal(Object.isExtensible(obj), false);
			assert.equal(Object.isExtensible(obj.p1.p2), false);
			assert.equal(Object.isExtensible(obj.p1.p2.p3), false);
		});
	});
});

// Types check
const obj = { p1: 1, p2: { p3: 1 } };
const x = deepLock(obj); // expect DeepReadOnly<T>
const x2 = deepLock(obj, {}); //  expect DeepReadOnly<T>
const x3 = deepLock(obj, { action: 'freeze' }); //  expect DeepReadOnly<T>
const x4 = deepLock(obj, { action: 'seal' }); // expect T
const x5 = deepLock(obj, { action: 'preventExtensions' }); // expect T
