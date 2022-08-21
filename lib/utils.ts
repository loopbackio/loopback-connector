// Copyright IBM Corp. 2015,2019. All Rights Reserved.
// Node module: loopback-connector
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

type PromiseCallback = <T extends unknown>() => {
  (err: unknown, data: T): void;
  promise: Promise<T>;
};

export function createPromiseCallback(): PromiseCallback {
  let cb: PromiseCallback;

  const promise = new Promise(function(resolve, reject) {
    // @ts-ignore
    cb = function(err, data) {
      if (err) return reject(err);
      return resolve(data);
    };
  });
  // @ts-ignore
  cb.promise = promise;
  // @ts-ignore
  return cb;
}
