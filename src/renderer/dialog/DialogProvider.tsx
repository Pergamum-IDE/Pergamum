import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import type { AppPlatform } from "../../shared/platform";
import type { Translate } from "../../shared/i18n";
import {
  type AppChoiceDialogOptions,
  type AppChoiceDialogResult,
  type AppConfirmDialogOptions,
  type AppConfirmDialogResult,
  type AppDialogActionOrder
} from "./appDialogTypes";
import { ChoiceDialog } from "./ChoiceDialog";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  navigatorClipboardAdapter,
  type ClipboardAdapter
} from "./clipboardAdapter";
import {
  DialogController,
  type DialogControllerPendingRequest
} from "./dialogController";

export interface DialogContextValue {
  confirm(options: AppConfirmDialogOptions): Promise<AppConfirmDialogResult>;
  choice(options: AppChoiceDialogOptions): Promise<AppChoiceDialogResult>;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export interface DialogProviderProps {
  /**
   * Resolved once at the application boundary from the real runtime
   * platform (see `src/preload/platform.ts`) and injected here — the
   * dialog components themselves never read platform directly (D-11).
   */
  actionOrder: AppDialogActionOrder;
  platform?: AppPlatform;
  translate: Translate;
  clipboardAdapter?: ClipboardAdapter;
  children: ReactNode;
}

export function DialogProvider({
  actionOrder,
  platform = "other",
  translate,
  clipboardAdapter = navigatorClipboardAdapter,
  children
}: DialogProviderProps): JSX.Element {
  const controllerRef = useRef<DialogController | null>(null);

  if (!controllerRef.current) {
    controllerRef.current = new DialogController();
  }

  const controller = controllerRef.current;
  const [pending, setPending] =
    useState<DialogControllerPendingRequest | null>(() =>
      controller.getPendingRequest()
    );
  const openerRef = useRef<Element | null>(null);

  useEffect(
    () => controller.subscribe(() => setPending(controller.getPendingRequest())),
    [controller]
  );

  // Host unmount: a pending confirm resolves "cancel" (D-16), while a pending
  // choice resolves dismissed (#192) rather than hanging forever.
  useEffect(() => () => controller.dispose(), [controller]);

  const contextValue = useMemo<DialogContextValue>(
    () => ({
      confirm: (options) => {
        if (typeof document !== "undefined") {
          openerRef.current = document.activeElement;
        }

        return controller.confirm(options);
      },
      choice: (options) => {
        if (typeof document !== "undefined") {
          openerRef.current = document.activeElement;
        }

        return controller.choice(options);
      }
    }),
    [controller]
  );

  return (
    <DialogContext.Provider value={contextValue}>
      {children}
      {pending?.kind === "confirm" ? (
        <ConfirmDialog
          options={pending.options}
          actionOrder={actionOrder}
          translate={translate}
          clipboardAdapter={clipboardAdapter}
          opener={openerRef.current}
          onResult={(result) => controller.resolve(result)}
        />
      ) : null}
      {pending?.kind === "choice" ? (
        <ChoiceDialog
          options={pending.options}
          platform={platform}
          translate={translate}
          clipboardAdapter={clipboardAdapter}
          opener={openerRef.current}
          onResult={(result) => controller.resolve(result)}
        />
      ) : null}
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogContextValue {
  const value = useContext(DialogContext);

  if (!value) {
    throw new Error("useDialog must be used within a DialogProvider.");
  }

  return value;
}
