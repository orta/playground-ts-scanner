import type {SyntaxKind, NodeFlags, ModifierFlags, EmitFlags, ObjectFlags, SymbolFlags, TypeFlags} from "typescript"

const enum Comparison {
  LessThan = -1,
  EqualTo = 0,
  GreaterThan = 1,
}

/**
 * Formats an enum value as a string for debugging and debug assertions.
 */
export function formatEnum(ts: typeof import("typescript"), value = 0, enumObject: any, isFlags?: boolean) {
  const members = getEnumMembers(enumObject);
  if (value === 0) {
    return members.length > 0 && members[0][0] === 0 ? members[0][1] : "0";
  }
  if (isFlags) {
    let result = "";
    let remainingFlags = value;
    for (let i = members.length - 1; i >= 0 && remainingFlags !== 0; i--) {
      const [enumValue, enumName] = members[i];
      if (enumValue !== 0 && (remainingFlags & enumValue) === enumValue) {
        remainingFlags &= ~enumValue;
        result = `${enumName}${result ? "|" : ""}${result}`;
      }
    }
    if (remainingFlags === 0) {
      return result;
    }
  } else {
    for (const [enumValue, enumName] of members) {
      if (enumValue === value) {
        return enumName;
      }
    }
  }
  return value.toString();

  function getEnumMembers(enumObject: any) {
    const result: [number, string][] = [];
    for (const name in enumObject) {
      const value = enumObject[name];
      if (typeof value === "number") {
        result.push([value, name]);
      }
    }

    return stableSort<[number, string]>(result, (x, y) => compareValues(x[0], y[0]));
  }

  function formatSyntaxKind(kind: SyntaxKind | undefined): string {
    return formatEnum(ts, kind, (<any>ts).SyntaxKind, /*isFlags*/ false);
  }

  function formatNodeFlags(flags: NodeFlags | undefined): string {
    return formatEnum(ts, flags, (<any>ts).NodeFlags, /*isFlags*/ true);
  }

  function formatModifierFlags(flags: ModifierFlags | undefined): string {
    return formatEnum(ts, flags, (<any>ts).ModifierFlags, /*isFlags*/ true);
  }

  // function formatTransformFlags(flags: ts.TransformFlags | undefined): string {
  //   return formatEnum(flags, (<any>ts).TransformFlags, /*isFlags*/ true)
  // }

  function formatEmitFlags(flags: EmitFlags | undefined): string {
    return formatEnum(ts,flags, (<any>ts).EmitFlags, /*isFlags*/ true);
  } 

  function formatSymbolFlags(flags: SymbolFlags | undefined): string {
    return formatEnum(ts, flags, (<any>ts).SymbolFlags, /*isFlags*/ true);
  }

  function formatTypeFlags(flags: TypeFlags | undefined): string {
    return formatEnum(ts, flags, (<any>ts).TypeFlags, /*isFlags*/ true);
  }

  function formatObjectFlags(flags: ObjectFlags | undefined): string {
    return formatEnum(ts, flags, (<any>ts).ObjectFlags, /*isFlags*/ true);
  }



  type Comparer<T> = (a: T, b: T) => Comparison;

  function compareComparableValues(a: string | undefined, b: string | undefined): Comparison;
  function compareComparableValues(a: number | undefined, b: number | undefined): Comparison;
  function compareComparableValues(a: string | number | undefined, b: string | number | undefined) {
    return a === b
      ? Comparison.EqualTo
      : a === undefined
      ? Comparison.LessThan
      : b === undefined
      ? Comparison.GreaterThan
      : a < b
      ? Comparison.LessThan
      : Comparison.GreaterThan;
  }

  function compareValues(a: number | undefined, b: number | undefined): Comparison {
    return compareComparableValues(a, b);
  }

  function stableSortIndices<T>(array: ReadonlyArray<T>, indices: number[], comparer: Comparer<T>) {
    // sort indices by value then position
    indices.sort((x, y) => comparer(array[x], array[y]) || compareValues(x, y));
  }

  function stableSort<T>(array: ReadonlyArray<T>, comparer: Comparer<T>): ReadonlyArray<T> {
    const indices = array.map((_, i) => i);
    stableSortIndices(array, indices, comparer);
    return indices.map((i) => array[i]) as ReadonlyArray<T>;
  }
}
