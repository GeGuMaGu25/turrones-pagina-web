export function assert(cond, msg, status = 400) {
    if (!cond) {
      const e = new Error(msg);
      e.status = status;
      throw e;
    }
  }
  