/**
 * Optimal Route Algorithm using Dynamic Programming (Held-Karp)
 *
 * This implements an EXACT solution to the Pickup-Delivery TSP variant.
 * Time Complexity: O(n² × 2ⁿ) where n = number of stops
 * Space Complexity: O(n × 2ⁿ)
 *
 * Due to exponential complexity, this is limited to ~15-18 orders (30-36 stops).
 * For larger sets, use the heuristic algorithm.
 *
 * Key insight: This finds the PROVABLY OPTIMAL route, not an approximation.
 * Use it to benchmark the heuristic and understand the gap.
 */

export interface OptimalStop {
  id: string;
  orderId: string;
  type: 'pickup' | 'delivery';
  location: { lat: number; lng: number };
  earning: number; // Courier earning for this order
  handlingTime: number; // Time spent at this stop (minutes)
  pairId: string; // Links pickup to its delivery
}

export interface OptimalRouteResult {
  stops: OptimalStop[];
  totalDistance: number; // km
  totalTime: number; // minutes
  totalEarnings: number; // currency
  earningsPerHour: number; // currency/hour
  earningsPerKm: number; // currency/km
  isOptimal: boolean;
  algorithmUsed: 'held-karp' | 'branch-and-bound' | 'heuristic-fallback';
  computeTimeMs: number;
}

interface DPState {
  cost: number; // Total distance/time to reach this state
  parent: number; // Previous stop index
  parentMask: number; // Previous mask
}

const INFINITY = Number.MAX_SAFE_INTEGER;

/**
 * Calculate Haversine distance between two points in kilometers
 */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Estimate travel time in minutes (assuming 25 km/h average in city)
 */
function estimateTravelTime(distanceKm: number): number {
  return (distanceKm / 25) * 60;
}

/**
 * Build distance matrix between all stops + starting point
 * Index 0 = starting point
 * Index 1..n = stops
 */
function buildDistanceMatrix(
  startingPoint: { lat: number; lng: number },
  stops: OptimalStop[],
): number[][] {
  const n = stops.length + 1;
  const dist: number[][] = Array(n)
    .fill(null)
    .map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;

      const from = i === 0 ? startingPoint : stops[i - 1].location;
      const to = j === 0 ? startingPoint : stops[j - 1].location;

      dist[i][j] = haversineDistance(from.lat, from.lng, to.lat, to.lng);
    }
  }

  return dist;
}

/**
 * Check if a bitmask represents a valid partial route
 * (all pickups for visited deliveries must be included)
 */
function isValidMask(
  mask: number,
  stops: OptimalStop[],
  pickupIndices: Map<string, number>,
): boolean {
  for (let i = 0; i < stops.length; i++) {
    if (!(mask & (1 << i))) continue; // Stop not visited

    const stop = stops[i];
    if (stop.type === 'delivery') {
      const pickupIdx = pickupIndices.get(stop.pairId);
      if (pickupIdx === undefined) return false;
      // Pickup must be in mask
      if (!(mask & (1 << pickupIdx))) return false;
    }
  }
  return true;
}

/**
 * Held-Karp Algorithm for Pickup-Delivery TSP
 *
 * Standard Held-Karp finds shortest Hamiltonian path.
 * We modify it to enforce pickup-before-delivery constraint.
 */
export function solveOptimalRoute(
  startingPoint: { lat: number; lng: number },
  stops: OptimalStop[],
  maxCapacity: number,
  maxTimeMinutes?: number,
): OptimalRouteResult {
  const startTime = performance.now();

  const n = stops.length;

  // Safety check - exponential algorithm, limit to 20 stops (10 orders)
  if (n > 20) {
    return solveWithBranchAndBound(
      startingPoint,
      stops,
      maxCapacity,
      maxTimeMinutes,
    );
  }

  if (n === 0) {
    return {
      stops: [],
      totalDistance: 0,
      totalTime: 0,
      totalEarnings: 0,
      earningsPerHour: 0,
      earningsPerKm: 0,
      isOptimal: true,
      algorithmUsed: 'held-karp',
      computeTimeMs: performance.now() - startTime,
    };
  }

  // Build lookup maps
  const pickupIndices = new Map<string, number>();
  const deliveryIndices = new Map<string, number>();

  for (let i = 0; i < n; i++) {
    if (stops[i].type === 'pickup') {
      pickupIndices.set(stops[i].pairId, i);
    } else {
      deliveryIndices.set(stops[i].pairId, i);
    }
  }

  const dist = buildDistanceMatrix(startingPoint, stops);

  // DP table: dp[mask][i] = minimum cost to visit stops in mask, ending at stop i
  // mask is a bitmask of visited stops (excluding starting point)
  const dp: Map<number, Map<number, DPState>> = new Map();

  // Initialize: start from starting point (index 0 in distance matrix)
  // First stop must be a pickup
  for (let i = 0; i < n; i++) {
    if (stops[i].type !== 'pickup') continue;

    const mask = 1 << i;
    const cost = dist[0][i + 1]; // From starting point to stop i

    if (!dp.has(mask)) dp.set(mask, new Map());
    const dpMask = dp.get(mask);
    if (dpMask) dpMask.set(i, { cost, parent: -1, parentMask: 0 });
  }

  // Iterate through all possible subsets in increasing order of size
  for (let size = 2; size <= n; size++) {
    // Generate all subsets of size `size`
    const subsets = generateSubsetsOfSize(n, size);

    for (const mask of subsets) {
      // Check validity - all deliveries must have their pickups
      if (!isValidMask(mask, stops, pickupIndices)) continue;

      if (!dp.has(mask)) dp.set(mask, new Map());
      const currentDp = dp.get(mask);
      if (!currentDp) continue;

      // For each stop in the mask, compute cost to end there
      for (let last = 0; last < n; last++) {
        if (!(mask & (1 << last))) continue;

        const stop = stops[last];

        // If delivery, check that pickup was visited BEFORE in the path
        // (The mask check above ensures pickup is in mask, but we need order)
        // This is validated by checking prevMask includes the pickup below

        // Check capacity constraint
        const currentLoad = countActiveLoad(mask, last, stops, pickupIndices);
        if (currentLoad > maxCapacity) continue;

        const prevMask = mask ^ (1 << last);
        if (prevMask === 0) continue; // Already handled in initialization

        // If this is a delivery, the previous mask must include the pickup
        if (stop.type === 'delivery') {
          const pickupIdx = pickupIndices.get(stop.pairId);
          if (pickupIdx === undefined || !(prevMask & (1 << pickupIdx)))
            continue;
        }

        if (!dp.has(prevMask)) continue;
        const prevDp = dp.get(prevMask);
        if (!prevDp) continue;

        // Find best previous stop
        let bestCost = INFINITY;
        let bestPrev = -1;

        for (const [prev, state] of prevDp.entries()) {
          const newCost = state.cost + dist[prev + 1][last + 1];
          if (newCost < bestCost) {
            bestCost = newCost;
            bestPrev = prev;
          }
        }

        if (
          bestPrev >= 0 &&
          bestCost < (currentDp.get(last)?.cost ?? INFINITY)
        ) {
          currentDp.set(last, {
            cost: bestCost,
            parent: bestPrev,
            parentMask: prevMask,
          });
        }
      }
    }
  }

  // Find best complete route (all stops visited)
  const fullMask = (1 << n) - 1;
  if (!dp.has(fullMask)) {
    // No valid complete route found (capacity or constraint violation)
    return solveWithBranchAndBound(
      startingPoint,
      stops,
      maxCapacity,
      maxTimeMinutes,
    );
  }

  const finalDp = dp.get(fullMask);
  if (!finalDp) {
    return solveWithBranchAndBound(
      startingPoint,
      stops,
      maxCapacity,
      maxTimeMinutes,
    );
  }
  let bestLast = -1;
  let bestCost = INFINITY;

  for (const [last, state] of finalDp.entries()) {
    if (state.cost < bestCost) {
      bestCost = state.cost;
      bestLast = last;
    }
  }

  if (bestLast < 0) {
    return solveWithBranchAndBound(
      startingPoint,
      stops,
      maxCapacity,
      maxTimeMinutes,
    );
  }

  // Reconstruct path
  const path: number[] = [];
  let currentMask = fullMask;
  let currentLast = bestLast;

  while (currentLast >= 0) {
    path.unshift(currentLast);
    const maskDp = dp.get(currentMask);
    if (!maskDp) break;
    const state = maskDp.get(currentLast);
    if (!state) break;
    currentMask = state.parentMask;
    currentLast = state.parent;
  }

  // Build result
  const orderedStops = path.map((i) => stops[i]);
  const totalDistance = bestCost;
  let totalTime = 0;
  let prevLoc = startingPoint;

  for (const stop of orderedStops) {
    const d = haversineDistance(
      prevLoc.lat,
      prevLoc.lng,
      stop.location.lat,
      stop.location.lng,
    );
    totalTime += estimateTravelTime(d) + stop.handlingTime;
    prevLoc = stop.location;
  }

  const totalEarnings = orderedStops
    .filter((s) => s.type === 'delivery')
    .reduce((sum, s) => sum + s.earning, 0);

  const computeTimeMs = performance.now() - startTime;

  return {
    stops: orderedStops,
    totalDistance: Math.round(totalDistance * 100) / 100,
    totalTime: Math.round(totalTime),
    totalEarnings: Math.round(totalEarnings * 100) / 100,
    earningsPerHour:
      totalTime > 0
        ? Math.round((totalEarnings / (totalTime / 60)) * 100) / 100
        : 0,
    earningsPerKm:
      totalDistance > 0
        ? Math.round((totalEarnings / totalDistance) * 100) / 100
        : 0,
    isOptimal: true,
    algorithmUsed: 'held-karp',
    computeTimeMs: Math.round(computeTimeMs),
  };
}

/**
 * Count current load after visiting stops in mask, ending at `last`
 */
function countActiveLoad(
  mask: number,
  last: number,
  stops: OptimalStop[],
  _pickupIndices: Map<string, number>,
): number {
  // Count pickups minus deliveries in the path leading to `last`
  // _pickupIndices reserved for future use
  void _pickupIndices;
  let load = 0;
  for (let i = 0; i <= last; i++) {
    if (!(mask & (1 << i))) continue;
    if (stops[i].type === 'pickup') load++;
    else load--;
  }
  return load;
}

/**
 * Generate all bitmasks with exactly k bits set, for n total bits
 */
function generateSubsetsOfSize(n: number, k: number): number[] {
  const result: number[] = [];

  function backtrack(start: number, current: number, bitsSet: number) {
    if (bitsSet === k) {
      result.push(current);
      return;
    }
    if (start >= n || n - start < k - bitsSet) return;

    // Include bit at position start
    backtrack(start + 1, current | (1 << start), bitsSet + 1);
    // Exclude
    backtrack(start + 1, current, bitsSet);
  }

  backtrack(0, 0, 0);
  return result;
}

/**
 * Branch and Bound solver for larger problems
 * Falls back to intelligent pruning when Held-Karp is too expensive
 */
function solveWithBranchAndBound(
  startingPoint: { lat: number; lng: number },
  stops: OptimalStop[],
  maxCapacity: number,
  maxTimeMinutes?: number,
): OptimalRouteResult {
  const startTime = performance.now();

  const n = stops.length;
  const dist = buildDistanceMatrix(startingPoint, stops);

  // Build order pairs
  const pairs: { pickupIdx: number; deliveryIdx: number; earning: number }[] =
    [];
  const pickupToDelivery = new Map<number, number>();

  for (let i = 0; i < n; i++) {
    if (stops[i].type === 'pickup') {
      const deliveryIdx = stops.findIndex(
        (s) => s.type === 'delivery' && s.pairId === stops[i].pairId,
      );
      if (deliveryIdx >= 0) {
        pairs.push({
          pickupIdx: i,
          deliveryIdx,
          earning: stops[deliveryIdx].earning,
        });
        pickupToDelivery.set(i, deliveryIdx);
      }
    }
  }

  let bestRoute: number[] = [];
  let bestCost = INFINITY;
  let nodesExplored = 0;
  const maxNodes = 1000000; // Limit exploration

  function bound(path: number[], cost: number): number {
    // Lower bound: current cost + minimum remaining edges
    const visited = new Set(path);
    let remaining = 0;

    for (let i = 0; i < n; i++) {
      if (visited.has(i)) continue;
      // Minimum edge to any unvisited node
      let minEdge = INFINITY;
      for (let j = 0; j < n + 1; j++) {
        if (i === j - 1) continue;
        if (j > 0 && visited.has(j - 1)) continue;
        minEdge = Math.min(minEdge, dist[j][i + 1]);
      }
      remaining += minEdge === INFINITY ? 0 : minEdge;
    }

    return cost + remaining;
  }

  function explore(
    path: number[],
    visited: Set<number>,
    cost: number,
    load: number,
  ) {
    nodesExplored++;
    if (nodesExplored > maxNodes) return;

    // Prune: if lower bound exceeds best, skip
    if (bound(path, cost) >= bestCost) return;

    // Complete route
    if (path.length === n) {
      if (cost < bestCost) {
        bestCost = cost;
        bestRoute = [...path];
      }
      return;
    }

    // Time limit check
    if (maxTimeMinutes) {
      let time = 0;
      let prev = startingPoint;
      for (const idx of path) {
        const d = haversineDistance(
          prev.lat,
          prev.lng,
          stops[idx].location.lat,
          stops[idx].location.lng,
        );
        time += estimateTravelTime(d) + stops[idx].handlingTime;
        prev = stops[idx].location;
      }
      if (time > maxTimeMinutes) return;
    }

    // Generate candidates
    const candidates: { idx: number; priority: number }[] = [];

    for (let i = 0; i < n; i++) {
      if (visited.has(i)) continue;

      const stop = stops[i];

      // Pickup: check capacity
      if (stop.type === 'pickup') {
        if (load >= maxCapacity) continue;
        const lastIdx = path.length > 0 ? path[path.length - 1] + 1 : 0;
        candidates.push({
          idx: i,
          priority: dist[lastIdx][i + 1],
        });
      }

      // Delivery: check pickup was done
      if (stop.type === 'delivery') {
        const pickupIdx = stops.findIndex(
          (s) => s.type === 'pickup' && s.pairId === stop.pairId,
        );
        if (pickupIdx < 0 || !visited.has(pickupIdx)) continue;
        const lastIdx = path.length > 0 ? path[path.length - 1] + 1 : 0;
        candidates.push({
          idx: i,
          priority: dist[lastIdx][i + 1],
        });
      }
    }

    // Sort by distance (nearest first for better pruning)
    candidates.sort((a, b) => a.priority - b.priority);

    for (const { idx } of candidates) {
      const lastIdx = path.length > 0 ? path[path.length - 1] + 1 : 0;
      const newCost = cost + dist[lastIdx][idx + 1];
      const newLoad = load + (stops[idx].type === 'pickup' ? 1 : -1);

      path.push(idx);
      visited.add(idx);
      explore(path, visited, newCost, newLoad);
      path.pop();
      visited.delete(idx);

      if (nodesExplored > maxNodes) return;
    }
  }

  // Start exploration from all pickups
  for (let i = 0; i < n; i++) {
    if (stops[i].type !== 'pickup') continue;
    explore([i], new Set([i]), dist[0][i + 1], 1);
    if (nodesExplored > maxNodes) break;
  }

  // Build result
  const orderedStops = bestRoute.map((i) => stops[i]);
  let totalTime = 0;
  let prevLoc = startingPoint;

  for (const stop of orderedStops) {
    const d = haversineDistance(
      prevLoc.lat,
      prevLoc.lng,
      stop.location.lat,
      stop.location.lng,
    );
    totalTime += estimateTravelTime(d) + stop.handlingTime;
    prevLoc = stop.location;
  }

  const totalEarnings = orderedStops
    .filter((s) => s.type === 'delivery')
    .reduce((sum, s) => sum + s.earning, 0);

  const computeTimeMs = performance.now() - startTime;

  return {
    stops: orderedStops,
    totalDistance: Math.round(bestCost * 100) / 100,
    totalTime: Math.round(totalTime),
    totalEarnings: Math.round(totalEarnings * 100) / 100,
    earningsPerHour:
      totalTime > 0
        ? Math.round((totalEarnings / (totalTime / 60)) * 100) / 100
        : 0,
    earningsPerKm:
      bestCost > 0 ? Math.round((totalEarnings / bestCost) * 100) / 100 : 0,
    isOptimal: nodesExplored <= maxNodes, // True optimal only if we explored everything
    algorithmUsed: 'branch-and-bound',
    computeTimeMs: Math.round(computeTimeMs),
  };
}

/**
 * Find the best subset of orders that MAXIMIZES TOTAL EARNINGS
 * within time and capacity constraints.
 *
 * KEY INSIGHT: We want to fill the time bucket as much as possible
 * with the highest-earning orders, not just maximize ₾/hour.
 *
 * A 10-order route taking 4h earning ₾40 is WORSE than
 * a 20-order route taking 7.5h earning ₾75 for an 8h bucket.
 *
 * @param breakTimeMinutes - Time reserved for breaks (subtracted from available time)
 */
export function findBestOrderSubset(
  startingPoint: { lat: number; lng: number },
  allOrders: {
    orderId: string;
    pickupLocation: { lat: number; lng: number };
    deliveryLocation: { lat: number; lng: number };
    earning: number;
    handlingTime: number;
  }[],
  maxCapacity: number,
  maxTimeMinutes: number,
  breakTimeMinutes = 0,
): OptimalRouteResult {
  const startTime = performance.now();

  // Subtract break time from available time budget
  const effectiveTimeMinutes = maxTimeMinutes - breakTimeMinutes;

  // For small sets, try all combinations - maximize TOTAL EARNINGS
  if (allOrders.length <= 10) {
    return findBestSubsetExhaustive(
      startingPoint,
      allOrders,
      maxCapacity,
      effectiveTimeMinutes,
      startTime,
    );
  }

  // For larger sets, use greedy packing to fill the time budget
  return findBestSubsetGreedyPacking(
    startingPoint,
    allOrders,
    maxCapacity,
    effectiveTimeMinutes,
    startTime,
  );
}

function findBestSubsetExhaustive(
  startingPoint: { lat: number; lng: number },
  allOrders: {
    orderId: string;
    pickupLocation: { lat: number; lng: number };
    deliveryLocation: { lat: number; lng: number };
    earning: number;
    handlingTime: number;
  }[],
  maxCapacity: number,
  maxTimeMinutes: number,
  startTime: number,
): OptimalRouteResult {
  let bestResult: OptimalRouteResult | null = null;

  const n = allOrders.length;
  const totalSubsets = 1 << n;

  for (let mask = 1; mask < totalSubsets; mask++) {
    const selectedOrders: typeof allOrders = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        selectedOrders.push(allOrders[i]);
      }
    }

    // Convert to stops
    const stops: OptimalStop[] = [];
    for (const order of selectedOrders) {
      stops.push({
        id: `${order.orderId}-pickup`,
        orderId: order.orderId,
        type: 'pickup',
        location: order.pickupLocation,
        earning: 0,
        handlingTime: order.handlingTime,
        pairId: order.orderId,
      });
      stops.push({
        id: `${order.orderId}-delivery`,
        orderId: order.orderId,
        type: 'delivery',
        location: order.deliveryLocation,
        earning: order.earning,
        handlingTime: order.handlingTime,
        pairId: order.orderId,
      });
    }

    const result = solveOptimalRoute(
      startingPoint,
      stops,
      maxCapacity,
      maxTimeMinutes,
    );

    if (result.totalTime > maxTimeMinutes) continue;

    // MAXIMIZE TOTAL EARNINGS, not earnings per hour
    // This ensures we fill the time bucket with as much revenue as possible
    if (!bestResult || result.totalEarnings > bestResult.totalEarnings) {
      bestResult = result;
    }
  }

  return (
    bestResult || {
      stops: [],
      totalDistance: 0,
      totalTime: 0,
      totalEarnings: 0,
      earningsPerHour: 0,
      earningsPerKm: 0,
      isOptimal: true,
      algorithmUsed: 'held-karp',
      computeTimeMs: performance.now() - startTime,
    }
  );
}

/**
 * Greedy packing algorithm to FILL the time budget with maximum earnings.
 *
 * Strategy:
 * 1. Sort orders by earning/estimated-time ratio (efficiency)
 * 2. Greedily add orders until time budget is full
 * 3. After route optimization, if there's remaining time, try adding more
 * 4. Use local search to swap orders for better total earnings
 */
function findBestSubsetGreedyPacking(
  startingPoint: { lat: number; lng: number },
  allOrders: {
    orderId: string;
    pickupLocation: { lat: number; lng: number };
    deliveryLocation: { lat: number; lng: number };
    earning: number;
    handlingTime: number;
  }[],
  maxCapacity: number,
  maxTimeMinutes: number,
  startTime: number,
): OptimalRouteResult {
  // Calculate efficiency and estimated time for each order
  // IMPORTANT: estimatedTime is for CHAINED orders (just pickup-to-delivery, no return)
  // because when chaining, we don't go back to start after each order
  const scoredOrders = allOrders.map((order) => {
    // Distance just from pickup to delivery (the core delivery work)
    const deliveryDist = haversineDistance(
      order.pickupLocation.lat,
      order.pickupLocation.lng,
      order.deliveryLocation.lat,
      order.deliveryLocation.lng,
    );
    // Estimate 3km average hop between orders when chained (realistic for city routes)
    const avgHopDistance = 3;
    const chainedTime =
      estimateTravelTime(deliveryDist + avgHopDistance) +
      order.handlingTime * 2;
    const efficiency = order.earning / chainedTime;

    return { ...order, efficiency, estimatedTime: chainedTime, deliveryDist };
  });

  // Phase 1: Initial greedy selection
  // Sort by efficiency (best first) to get a good starting point
  const byEfficiency = [...scoredOrders].sort(
    (a, b) => b.efficiency - a.efficiency,
  );

  let selectedOrderIds = new Set<string>();
  let estimatedTotalTime = 0;

  // Add initial trip time (from start to first pickup)
  const firstOrderTripTime = 10; // ~10 min to reach first pickup on average

  // First pass: add orders until we EXCEED the time budget by 20%
  // We're aggressive here because the actual routing is more efficient than our estimate
  for (const order of byEfficiency) {
    const newEstimate =
      estimatedTotalTime +
      order.estimatedTime +
      (selectedOrderIds.size === 0 ? firstOrderTripTime : 0);
    if (newEstimate <= maxTimeMinutes * 1.2) {
      selectedOrderIds.add(order.orderId);
      estimatedTotalTime = newEstimate;
    }
  }

  // If we haven't selected any, start with the single best order
  if (selectedOrderIds.size === 0 && byEfficiency.length > 0) {
    selectedOrderIds.add(byEfficiency[0].orderId);
  }

  // Phase 2: Sort remaining by earning and add as many as can fit
  const addMoreOrders = () => {
    const remaining = scoredOrders.filter(
      (o) => !selectedOrderIds.has(o.orderId),
    );
    const byEarning = [...remaining].sort((a, b) => b.earning - a.earning);

    for (const order of byEarning) {
      // Try adding this order and see if it fits based on estimate
      const currentEstimate = scoredOrders
        .filter((o) => selectedOrderIds.has(o.orderId))
        .reduce((sum, o) => sum + o.estimatedTime, firstOrderTripTime);

      // Be aggressive - add if we estimate it might fit
      if (currentEstimate + order.estimatedTime <= maxTimeMinutes * 1.15) {
        selectedOrderIds.add(order.orderId);
      }
    }
  };

  addMoreOrders();

  // Phase 3: Build the actual route with selected orders and verify it fits
  let selectedOrders = scoredOrders.filter((o) =>
    selectedOrderIds.has(o.orderId),
  );
  let bestResult = buildAndSolveRoute(
    startingPoint,
    selectedOrders,
    maxCapacity,
    maxTimeMinutes,
  );

  // If the actual route exceeds the time limit, remove orders until it fits
  while (bestResult.totalTime > maxTimeMinutes && selectedOrderIds.size > 1) {
    // Remove the lowest-earning order
    const currentSelected = scoredOrders.filter((o) =>
      selectedOrderIds.has(o.orderId),
    );
    const lowestEarner = currentSelected.reduce(
      (min, o) => (o.earning < min.earning ? o : min),
      currentSelected[0],
    );

    selectedOrderIds.delete(lowestEarner.orderId);
    selectedOrders = scoredOrders.filter((o) =>
      selectedOrderIds.has(o.orderId),
    );
    bestResult = buildAndSolveRoute(
      startingPoint,
      selectedOrders,
      maxCapacity,
      maxTimeMinutes,
    );
  }

  // Phase 4: Now that we have a valid route, try adding more orders one by one
  const tryAddingMoreOrders = () => {
    let improved = true;
    let iterations = 0;
    const maxIterations = allOrders.length * 2; // Allow more iterations to find orders

    while (improved && iterations < maxIterations) {
      improved = false;
      iterations++;
      const remaining = scoredOrders.filter(
        (o) => !selectedOrderIds.has(o.orderId),
      );

      if (remaining.length === 0) {
        break;
      }

      // Calculate the centroid of the current route to score orders by proximity
      const currentOrderLocations = scoredOrders
        .filter((o) => selectedOrderIds.has(o.orderId))
        .flatMap((o) => [o.pickupLocation, o.deliveryLocation]);

      const centroid =
        currentOrderLocations.length > 0
          ? {
              lat:
                currentOrderLocations.reduce((sum, loc) => sum + loc.lat, 0) /
                currentOrderLocations.length,
              lng:
                currentOrderLocations.reduce((sum, loc) => sum + loc.lng, 0) /
                currentOrderLocations.length,
            }
          : startingPoint;

      // Score remaining orders by: high earnings + close to route = better
      const scoredRemaining = remaining.map((order) => {
        const pickupDist = haversineDistance(
          centroid.lat,
          centroid.lng,
          order.pickupLocation.lat,
          order.pickupLocation.lng,
        );
        const deliveryDist = haversineDistance(
          centroid.lat,
          centroid.lng,
          order.deliveryLocation.lat,
          order.deliveryLocation.lng,
        );
        const avgDist = (pickupDist + deliveryDist) / 2;
        // Score: earnings / (1 + distance) - rewards high earnings AND proximity
        const score = order.earning / (1 + avgDist);
        return { ...order, proximityScore: score, avgDistFromRoute: avgDist };
      });

      // Sort by score (high = good)
      scoredRemaining.sort((a, b) => b.proximityScore - a.proximityScore);

      for (const toAdd of scoredRemaining) {
        const testOrderIds = new Set(selectedOrderIds);
        testOrderIds.add(toAdd.orderId);

        const testOrders = scoredOrders.filter((o) =>
          testOrderIds.has(o.orderId),
        );
        const testResult = buildAndSolveRoute(
          startingPoint,
          testOrders,
          maxCapacity,
          maxTimeMinutes,
        );

        // Check if adding this order still fits in time budget
        const timeIncrease = testResult.totalTime - bestResult.totalTime;

        if (testResult.totalTime <= maxTimeMinutes) {
          selectedOrderIds = testOrderIds;
          bestResult = testResult;
          improved = true;
          break;
        }
      }
    }
  };

  tryAddingMoreOrders();

  // Phase 5: Local search - try swapping lower-earning orders with higher-earning unselected ones
  const maxSwapIterations = 30;
  let swapImproved = true;
  let swapIterations = 0;

  while (swapImproved && swapIterations < maxSwapIterations) {
    swapImproved = false;
    swapIterations++;

    // Get current selected and unselected orders
    const currentSelected = scoredOrders.filter((o) =>
      selectedOrderIds.has(o.orderId),
    );
    const currentUnselected = scoredOrders.filter(
      (o) => !selectedOrderIds.has(o.orderId),
    );

    // Sort selected by earning (lowest first - candidates to remove)
    const lowEarners = [...currentSelected].sort(
      (a, b) => a.earning - b.earning,
    );
    // Sort unselected by earning (highest first - candidates to add)
    const highEarners = [...currentUnselected].sort(
      (a, b) => b.earning - a.earning,
    );

    // Try swapping
    for (const toRemove of lowEarners) {
      for (const toAdd of highEarners) {
        if (toAdd.earning <= toRemove.earning) continue; // Only swap for higher earnings

        // Test the swap
        const testOrderIds = new Set(selectedOrderIds);
        testOrderIds.delete(toRemove.orderId);
        testOrderIds.add(toAdd.orderId);

        const testOrders = scoredOrders.filter((o) =>
          testOrderIds.has(o.orderId),
        );
        const testResult = buildAndSolveRoute(
          startingPoint,
          testOrders,
          maxCapacity,
          maxTimeMinutes,
        );

        if (
          testResult.totalTime <= maxTimeMinutes &&
          testResult.totalEarnings > bestResult.totalEarnings
        ) {
          selectedOrderIds = testOrderIds;
          bestResult = testResult;
          swapImproved = true;
          break;
        }
      }
      if (swapImproved) break;
    }
  }

  // Final phase: One more attempt to add orders after swaps
  tryAddingMoreOrders();

  return {
    ...bestResult,
    computeTimeMs: performance.now() - startTime,
  };
}

/**
 * Helper to build stops and solve the route for a set of orders
 * Uses a fast greedy nearest-neighbor heuristic for large order sets
 */
function buildAndSolveRoute(
  startingPoint: { lat: number; lng: number },
  orders: {
    orderId: string;
    pickupLocation: { lat: number; lng: number };
    deliveryLocation: { lat: number; lng: number };
    earning: number;
    handlingTime: number;
  }[],
  maxCapacity: number,
  maxTimeMinutes: number,
): OptimalRouteResult {
  const startTime = performance.now();

  if (orders.length === 0) {
    return {
      stops: [],
      totalDistance: 0,
      totalTime: 0,
      totalEarnings: 0,
      earningsPerHour: 0,
      earningsPerKm: 0,
      isOptimal: true,
      algorithmUsed: 'held-karp',
      computeTimeMs: 0,
    };
  }

  // For small sets (≤10 orders = 20 stops), use exact algorithm
  if (orders.length <= 10) {
    const stops: OptimalStop[] = [];
    for (const order of orders) {
      stops.push({
        id: `${order.orderId}-pickup`,
        orderId: order.orderId,
        type: 'pickup',
        location: order.pickupLocation,
        earning: 0,
        handlingTime: order.handlingTime,
        pairId: order.orderId,
      });
      stops.push({
        id: `${order.orderId}-delivery`,
        orderId: order.orderId,
        type: 'delivery',
        location: order.deliveryLocation,
        earning: order.earning,
        handlingTime: order.handlingTime,
        pairId: order.orderId,
      });
    }
    return solveOptimalRoute(startingPoint, stops, maxCapacity, maxTimeMinutes);
  }

  // For larger sets, use FAST greedy nearest-neighbor with pickup-delivery constraints
  // This is much faster than branch-and-bound and gives good results
  return solveWithGreedyNearestNeighbor(
    startingPoint,
    orders,
    maxCapacity,
    maxTimeMinutes,
    startTime,
  );
}

/**
 * Fast greedy nearest-neighbor algorithm for large order sets
 * Routes ALL given orders efficiently - does NOT stop based on time
 * The caller is responsible for checking if the route fits the time budget
 */
function solveWithGreedyNearestNeighbor(
  startingPoint: { lat: number; lng: number },
  orders: {
    orderId: string;
    pickupLocation: { lat: number; lng: number };
    deliveryLocation: { lat: number; lng: number };
    earning: number;
    handlingTime: number;
  }[],
  maxCapacity: number,
  _maxTimeMinutes: number, // Not used - we route all orders
  startTime: number,
): OptimalRouteResult {
  // Build all stops
  const allStops: OptimalStop[] = [];
  for (const order of orders) {
    allStops.push({
      id: `${order.orderId}-pickup`,
      orderId: order.orderId,
      type: 'pickup',
      location: order.pickupLocation,
      earning: 0,
      handlingTime: order.handlingTime,
      pairId: order.orderId,
    });
    allStops.push({
      id: `${order.orderId}-delivery`,
      orderId: order.orderId,
      type: 'delivery',
      location: order.deliveryLocation,
      earning: order.earning,
      handlingTime: order.handlingTime,
      pairId: order.orderId,
    });
  }

  const route: OptimalStop[] = [];
  const visited = new Set<string>();
  const pickedUp = new Set<string>(); // Order IDs that have been picked up
  let currentLocation = startingPoint;
  let currentLoad = 0;

  // Route ALL stops using nearest-neighbor heuristic
  while (visited.size < allStops.length) {
    // Find next best stop
    let bestStop: OptimalStop | null = null;
    let bestDistance = Infinity;

    for (const stop of allStops) {
      if (visited.has(stop.id)) continue;

      // Check constraints
      if (stop.type === 'pickup') {
        // Can only pick up if we have capacity
        if (currentLoad >= maxCapacity) continue;
      } else {
        // Can only deliver if we picked up this order
        if (!pickedUp.has(stop.orderId)) continue;
      }

      const dist = haversineDistance(
        currentLocation.lat,
        currentLocation.lng,
        stop.location.lat,
        stop.location.lng,
      );

      if (dist < bestDistance) {
        bestDistance = dist;
        bestStop = stop;
      }
    }

    if (!bestStop) break; // No valid next stop (shouldn't happen with valid input)

    // Add the stop (no time check - we route ALL orders)
    route.push(bestStop);
    visited.add(bestStop.id);
    currentLocation = bestStop.location;

    if (bestStop.type === 'pickup') {
      pickedUp.add(bestStop.orderId);
      currentLoad++;
    } else {
      currentLoad--;
    }
  }

  const totalEarnings = route
    .filter((s) => s.type === 'delivery')
    .reduce((sum, s) => sum + s.earning, 0);

  // Apply 2-opt improvement to reduce total distance/time
  // 2-opt tries reversing segments of the route to find better solutions
  const improvedRoute = apply2OptImprovement(route, startingPoint);

  // Recalculate totals after 2-opt
  let improvedTime = 0;
  let improvedDistance = 0;
  let prevLocation = startingPoint;

  for (const stop of improvedRoute) {
    const dist = haversineDistance(
      prevLocation.lat,
      prevLocation.lng,
      stop.location.lat,
      stop.location.lng,
    );
    improvedDistance += dist;
    improvedTime += estimateTravelTime(dist) + stop.handlingTime;
    prevLocation = stop.location;
  }

  return {
    stops: improvedRoute,
    totalDistance: Math.round(improvedDistance * 100) / 100,
    totalTime: Math.round(improvedTime),
    totalEarnings: Math.round(totalEarnings * 100) / 100,
    earningsPerHour:
      improvedTime > 0
        ? Math.round((totalEarnings / (improvedTime / 60)) * 100) / 100
        : 0,
    earningsPerKm:
      improvedDistance > 0
        ? Math.round((totalEarnings / improvedDistance) * 100) / 100
        : 0,
    isOptimal: false, // Greedy + 2-opt is near-optimal but not guaranteed optimal
    algorithmUsed: 'heuristic-fallback',
    computeTimeMs: Math.round(performance.now() - startTime),
  };
}

/**
 * Apply 2-opt improvement to a route
 * This tries reversing segments of the route to find a shorter total distance
 * while respecting pickup-before-delivery constraints
 */
function apply2OptImprovement(
  route: OptimalStop[],
  startingPoint: { lat: number; lng: number },
): OptimalStop[] {
  if (route.length < 4) return route; // Too short for 2-opt

  let improved = true;
  let currentRoute = [...route];
  let iterations = 0;
  const maxIterations = 100;

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    for (let i = 0; i < currentRoute.length - 2; i++) {
      for (let j = i + 2; j < currentRoute.length; j++) {
        // Try reversing the segment from i+1 to j
        const newRoute = [
          ...currentRoute.slice(0, i + 1),
          ...currentRoute.slice(i + 1, j + 1).reverse(),
          ...currentRoute.slice(j + 1),
        ];

        // Check if the new route is valid (pickup before delivery for all orders)
        if (isValidRoute(newRoute)) {
          const oldDist = calculateRouteTotalDistance(
            currentRoute,
            startingPoint,
          );
          const newDist = calculateRouteTotalDistance(newRoute, startingPoint);

          if (newDist < oldDist - 0.01) {
            // Small epsilon to avoid floating point issues
            currentRoute = newRoute;
            improved = true;
          }
        }
      }
    }
  }

  return currentRoute;
}

/**
 * Check if a route is valid (all pickups come before their deliveries)
 */
function isValidRoute(route: OptimalStop[]): boolean {
  const pickedUp = new Set<string>();
  for (const stop of route) {
    if (stop.type === 'pickup') {
      pickedUp.add(stop.orderId);
    } else {
      if (!pickedUp.has(stop.orderId)) return false;
    }
  }
  return true;
}

/**
 * Calculate total distance of a route from starting point through all stops
 */
function calculateRouteTotalDistance(
  route: OptimalStop[],
  startingPoint: { lat: number; lng: number },
): number {
  let totalDist = 0;
  let prev = startingPoint;
  for (const stop of route) {
    totalDist += haversineDistance(
      prev.lat,
      prev.lng,
      stop.location.lat,
      stop.location.lng,
    );
    prev = stop.location;
  }
  return totalDist;
}
