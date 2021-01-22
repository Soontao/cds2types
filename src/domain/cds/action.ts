import { Option } from "fp-ts/lib/Option";
import { Kind, Parameters, ReturnType } from "./core";

/**
 * CDS action.
 *
 * @export
 */
export type Action = {
    readonly kind: Kind;
    readonly params: Option<Parameters>;
    readonly returns: Option<ReturnType>;
};