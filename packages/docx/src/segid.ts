/** Generator de `segId` scurte („p_8f3k2a”), unice în cadrul unui document. */
export function createSegIdGenerator(used: Set<string> = new Set()): () => string {
  return () => {
    for (;;) {
      const id = `p_${Math.random().toString(36).slice(2, 8).padEnd(6, "0")}`;
      if (!used.has(id)) {
        used.add(id);
        return id;
      }
    }
  };
}
