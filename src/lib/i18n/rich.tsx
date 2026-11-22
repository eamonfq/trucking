import { Fragment, type ReactNode } from "react";

/**
 * Inserta elementos de React en un texto ya traducido, para frases con partes en negrita
 * o enlaces sin partirlas en trozos (el orden de las palabras cambia entre idiomas):
 *
 *   rich(t("Tu casillero {code} está activo."), { code: <strong>{lockerCode}</strong> })
 *
 * Sirve en componentes de servidor y de cliente.
 */
export function rich(text: string, nodes: Readonly<Record<string, ReactNode>>): ReactNode {
  return text.split(/(\{\w+\})/).map((part, index) => {
    const name = /^\{(\w+)\}$/.exec(part)?.[1];
    return <Fragment key={index}>{name && name in nodes ? nodes[name] : part}</Fragment>;
  });
}
