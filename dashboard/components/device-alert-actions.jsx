"use client";

import { useRef, useState } from "react";

const CONFIRM_ACTIONS = new Set(["suppress", "resolve"]);

function actionLabel(value) {
  return String(value ?? "unknown").replaceAll("_", " ");
}

function displayActionLabel(labels, value) {
  return labels.actionLabels?.[value] ?? actionLabel(value);
}

export function DeviceAlertActions({
  action,
  alertId,
  deviceId,
  actions,
  labels
}) {
  const formRef = useRef(null);
  const dialogRef = useRef(null);
  const actionInputRef = useRef(null);
  const [selectedAction, setSelectedAction] = useState("");

  function queueAction(nextAction) {
    if (actionInputRef.current) {
      actionInputRef.current.value = nextAction;
    }

    setSelectedAction(nextAction);

    if (CONFIRM_ACTIONS.has(nextAction)) {
      dialogRef.current?.showModal();
      return;
    }

    formRef.current?.requestSubmit();
  }

  function confirmAction() {
    dialogRef.current?.close();
    formRef.current?.requestSubmit();
  }

  return (
    <>
      <form className="inline-actions" action={action} ref={formRef}>
        <input type="hidden" name="device_id" value={deviceId} />
        <input type="hidden" name="alert_id" value={alertId} />
        <input name="action" ref={actionInputRef} type="hidden" />
        {actions.map((nextAction) => (
          <button
            className="button-secondary"
            key={nextAction}
            onClick={() => queueAction(nextAction)}
            type="button"
          >
            {displayActionLabel(labels, nextAction)}
          </button>
        ))}
      </form>

      <dialog className="confirm-dialog" ref={dialogRef}>
        <div className="confirm-dialog-panel">
          <p className="eyebrow">{labels.confirmEyebrow}</p>
          <h2>{labels.confirmTitle}</h2>
          <p className="muted">{labels.confirmBody.replace("{action}", displayActionLabel(labels, selectedAction))}</p>
          <div className="inline-actions">
            <button className="button" onClick={confirmAction} type="button">
              {labels.confirmAction}
            </button>
            <button className="button-secondary" onClick={() => dialogRef.current?.close()} type="button">
              {labels.cancelAction}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
