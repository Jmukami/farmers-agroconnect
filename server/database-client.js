import { AsyncLocalStorage } from 'node:async_hooks';

// Keep every query in an asynchronous transaction on the same connection.
// The context is isolated per request, including overlapping requests.
export function databaseClient(client) {
  const context = new AsyncLocalStorage();
  let pendingWrite = Promise.resolve();
  const connection = () => context.getStore() || client;
  return {
    prepare(sql) {
      const execute = (args) => connection().execute({ sql, args: args.length === 1 && args[0] && typeof args[0] === 'object' ? args[0] : args });
      return {
        async get(...args) { return (await execute(args)).rows[0]; },
        async all(...args) { return (await execute(args)).rows; },
        async run(...args) {
          const result = await execute(args);
          return { changes: result.rowsAffected, lastInsertRowid: result.lastInsertRowid == null ? undefined : Number(result.lastInsertRowid) };
        },
      };
    },
    async exec(sql) {
      await connection().executeMultiple(sql);
    },
    async transaction(callback) {
      const previousWrite = pendingWrite;
      let release;
      pendingWrite = new Promise((resolve) => { release = resolve; });
      await previousWrite;
      let transaction;
      try {
        transaction = await client.transaction('write');
        const result = await context.run(transaction, callback);
        await transaction.commit();
        return result;
      } catch (error) {
        if (transaction && !transaction.closed) await transaction.rollback();
        throw error;
      } finally {
        transaction?.close();
        release();
      }
    },
    close() { client.close(); },
  };
}
