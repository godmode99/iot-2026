"use client";

import { useRef, useState } from "react";

const HIGH_RISK_COMMANDS = new Set(["reboot", "ota_apply"]);

function commandLabel(value) {
  return String(value ?? "unknown").replaceAll("_", " ");
}

export function DeviceCommandForm({
  action,
  commandOptions,
  deviceId,
  labels
}) {
  const formRef = useRef(null);
  const dialogRef = useRef(null);
  const confirmedCommandRef = useRef("");
  const [selectedCommand, setSelectedCommand] = useState(commandOptions[0] ?? "");

  const isHighRisk = HIGH_RISK_COMMANDS.has(selectedCommand);

  function handleSubmit(event) {
    if (!HIGH_RISK_COMMANDS.has(selectedCommand) || confirmedCommandRef.current === selectedCommand) {
      confirmedCommandRef.current = "";
      return;
    }

    event.preventDefault();
    dialogRef.current?.showModal();
  }

  function confirmCommand() {
    confirmedCommandRef.current = selectedCommand;
    dialogRef.current?.close();
    formRef.current?.requestSubmit();
  }

  return (
    <>
      <form className="form" action={action} onSubmit={handleSubmit} ref={formRef}>
        <input type="hidden" name="device_id" value={deviceId} />
        <label>
          {labels.commandType}
          <select
            name="command_type"
            onChange={(event) => setSelectedCommand(event.target.value)}
            required
            value={selectedCommand}
          >
            {commandOptions.map((command) => (
              <option value={command} key={command}>{commandLabel(command)}</option>
            ))}
          </select>
        </label>
        {isHighRisk ? (
          <p className="notice command-risk-note" aria-live="polite">
            {labels.riskNotice}
          </p>
        ) : null}
        <label>
          {labels.commandNote}
          <input name="note" placeholder="optional audit note" />
        </label>
        <button className="button" type="submit">{labels.queueCommand}</button>
      </form>

      <dialog className="confirm-dialog" ref={dialogRef}>
        <div className="confirm-dialog-panel">
          <p className="eyebrow">{labels.confirmEyebrow}</p>
          <h2>{labels.confirmTitle}</h2>
          <p className="muted">{labels.confirmBody.replace("{command}", commandLabel(selectedCommand))}</p>
          <div className="inline-actions">
            <button className="button" onClick={confirmCommand} type="button">
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
