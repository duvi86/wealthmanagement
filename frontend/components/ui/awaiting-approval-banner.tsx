export function AwaitingApprovalBanner() {
  return (
    <div style={{ padding: "40px 20px", textAlign: "center" }}>
      <h1>Awaiting approval</h1>
      <p>
        Your account is authenticated but not yet authorized for this template.
      </p>
      <p>Please contact an administrator to request access.</p>
    </div>
  );
}
