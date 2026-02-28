export interface RoyaltyEdge {
  from: string; // Child asset ID
  to: string; // Parent asset ID
  share: number; // Percentage (0-100) of child's revenue that flows to parent
}

export interface RoyaltyNode {
  id: string;
  creator: string;
  baseRoyalty: number; // Percentage creator keeps (0-100)
  parents: RoyaltyEdge[];
}

export interface RoyaltyPath {
  edges: RoyaltyEdge[];
  totalShare: number;
  nodes: string[];
}

export class EconomicInvariants {
  static readonly MAX_DEPTH = 100;
  /**
   * 1. CYCLE DETECTION - DFS to ensure no asset is its own ancestor
   */
  static findCycles(nodes: RoyaltyNode[]): string[][] {
    const graph = new Map<string, string[]>();
    nodes.forEach(node => {
      graph.set(node.id, node.parents.map(p => p.to));
    });

    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (nodeId: string) => {
      if (recursionStack.has(nodeId)) {
        const cycleStart = path.indexOf(nodeId);
        const cycle = path.slice(cycleStart);
        cycles.push([...cycle, nodeId]);
        return;
      }

      if (visited.has(nodeId)) return;

      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const neighbors = graph.get(nodeId) || [];
      for (const neighbor of neighbors) {
        dfs(neighbor);
      }

      path.pop();
      recursionStack.delete(nodeId);
    };

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        dfs(node.id);
      }
    }

    return cycles;
  }

  static validateNoCycles(nodes: RoyaltyNode[]): boolean {
    const cycles = this.findCycles(nodes);
    if (cycles.length > 0) {
      throw new Error(`Cycle detected in royalty DAG: ${cycles.map(c => c.join(' → ')).join(', ')}`);
    }
    return true;
  }

  /**
   * 2. PATH VALIDATION - Find all paths and ensure total share ≤ 100%
   */
  static findAllPaths(nodes: RoyaltyNode[]): RoyaltyPath[] {
    const graph = new Map<string, RoyaltyNode>();
    nodes.forEach(node => graph.set(node.id, node));

    const allParents = new Set(nodes.flatMap(n => n.parents.map(p => p.to)));
    const leaves = nodes.filter(n => !allParents.has(n.id));

    const paths: RoyaltyPath[] = [];

    const dfs = (currentId: string, currentPath: RoyaltyEdge[], nodeIds: string[]) => {
      const node = graph.get(currentId);
      if (!node || node.parents.length === 0) {
        if (currentPath.length > 0) {
          paths.push({
            edges: [...currentPath],
            totalShare: currentPath.reduce((sum, e) => sum + e.share, 0),
            nodes: [...nodeIds]
          });
        }
        return;
      }

      for (const parent of node.parents) {
        dfs(parent.to, [...currentPath, parent], [...nodeIds, parent.to]);
      }
    };

    for (const leaf of leaves) {
      dfs(leaf.id, [], [leaf.id]);
    }

    return paths;
  }

  static validateRoyaltyDAG(nodes: RoyaltyNode[]): boolean {
    this.validateNoCycles(nodes);
    const paths = this.findAllPaths(nodes);

    for (const path of paths) {
      if (path.totalShare > 100) {
        throw new Error(
          `Royalty path exceeds 100%: ${path.edges.map(e => `${e.share}%`).join(' → ')} = ${path.totalShare}%`
        );
      }
    }

    return true;
  }

  /**
   * 3. RECURSIVE PAYOUT CALCULATION - Calculate total obligation for any node
   */
  static calculateTotalObligation(
    nodeId: string,
    nodes: Map<string, RoyaltyNode>,
    visited = new Set<string>()
  ): number {
    if (visited.has(nodeId)) return 0;
    visited.add(nodeId);

    const node = nodes.get(nodeId);
    if (!node) return 0;

    let totalObligation = 0;

    for (const parent of node.parents) {
      const directShare = parent.share;
      const parentObligation = this.calculateTotalObligation(parent.to, nodes, visited);
      const indirectObligation = (directShare * parentObligation) / 100;

      totalObligation += directShare + indirectObligation;
    }

    return Math.min(totalObligation, 100);
  }

  /**
   * Calculate the full distribution for a payment to a specific asset
   * Returns a map of recipient addresses to amounts (in basis points for precision)
   */
  static calculateDistribution(
    assetId: string,
    nodes: Map<string, RoyaltyNode>,
    paymentAmount: number
  ): Map<string, number> {
    const nodeList = Array.from(nodes.values());
    this.validateRoyaltyShares(nodeList);
    this.validateNoCycles(nodeList);

    const distribution = new Map<string, number>();

    const traverse = (currentId: string, amount: number, path: string[] = []) => {
      if (path.includes(currentId)) {
        throw new Error(`Cycle detected during distribution at ${currentId}`);
      }

      const node = nodes.get(currentId);
      if (!node) return;

      const creatorShare = (amount * node.baseRoyalty) / 100;
      const currentCreator = distribution.get(node.creator) || 0;
      distribution.set(node.creator, currentCreator + creatorShare);

      const remaining = amount - creatorShare;

      if (remaining > 0 && node.parents.length > 0) {
        const totalParentShare = node.parents.reduce((sum, p) => sum + p.share, 0);
        if (totalParentShare > 100) {
          throw new Error(`Parent shares for ${node.id} exceed 100%: ${totalParentShare}%`);
        }
        for (const parent of node.parents) {
          const parentAmount = (remaining * parent.share) / 100;
          traverse(parent.to, parentAmount, [...path, currentId]);
        }
      }
    };

    traverse(assetId, paymentAmount);
    return distribution;
  }

  /**
   * Validate that all royalty shares are within bounds
   */
  static validateRoyaltyShares(nodes: RoyaltyNode[]): boolean {
    for (const node of nodes) {
      if (node.baseRoyalty < 0 || node.baseRoyalty > 100) {
        throw new Error(`Invalid base royalty for ${node.id}: ${node.baseRoyalty}`);
      }

      let totalParentShare = 0;
      for (const parent of node.parents) {
        if (parent.share < 0 || parent.share > 100) {
          throw new Error(`Invalid parent share for ${node.id} → ${parent.to}: ${parent.share}`);
        }
        totalParentShare += parent.share;
      }

      if (totalParentShare > 100) {
        throw new Error(`Parent shares for ${node.id} exceed 100%: ${totalParentShare}%`);
      }

      if (node.baseRoyalty + totalParentShare > 100) {
        throw new Error(
          `Base royalty (${node.baseRoyalty}%) + parent shares (${totalParentShare}%) for ${node.id} exceed 100%`
        );
      }
    }

    return true;
  }
}
