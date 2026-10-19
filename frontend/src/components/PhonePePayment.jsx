import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import "./PhonePePayment.css";

function PhonePePayment({ amount, orderId }) {
  const [payment, setPayment] = useState(null);
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(Boolean(orderId));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;

    async function loadPayment() {
      if (!orderId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await apiFetch(`/api/payments/orders/${orderId}`);
        const currentPayment = await response.json();

        if (isCurrent) {
          setPayment(currentPayment);
          setReference(currentPayment?.reference || "");
        }
      } catch (requestError) {
        if (isCurrent) {
          setError(requestError.message);
        }
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    }

    loadPayment();

    return () => {
      isCurrent = false;
    };
  }, [orderId]);

  async function handlePaymentSubmitted(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await apiFetch(
        `/api/orders/${orderId}/payment-claim`,
        {
          method: "POST",
          body: { reference },
        }
      );

      const updatedOrder = await response.json();
      setPayment({
        status: updatedOrder.paymentStatus,
        reference: updatedOrder.paymentReference,
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="phonepe-payment">
      <div className="phonepe-payment-card">
        <h2 className="phonepe-payment-heading">Pay using PhonePe</h2>

        <p className="phonepe-payment-muted">
          Order ID: {orderId ?? "Not assigned"}
        </p>

        <div className="phonepe-payment-amount">
          <span>Total Amount</span>
          <h1>₹{Number(amount || 0).toFixed(2)}</h1>
        </div>

        <p className="phonepe-payment-instruction">
          Scan the QR code below using your UPI app. Enter the exact amount
          shown above.
        </p>

        <img
          src="/phonepe-qr.jpeg"
          alt="PhonePe payment QR code"
          className="phonepe-payment-qr"
        />

        <p className="phonepe-payment-warning">
          Verify the recipient name before paying. Submitted references are
          reviewed manually; the app does not verify payments with PhonePe.
        </p>

        {loading ? (
          <p className="phonepe-payment-muted" role="status">
            Checking payment status...
          </p>
        ) : payment?.status === "PENDING_VERIFICATION" ? (
          <div className="phonepe-payment-pending" role="status">
            <strong>Payment pending manual verification</strong>
            <p>
              Your transaction reference has been saved. An administrator must
              check the payment before it is approved.
            </p>
          </div>
        ) : payment?.status === "APPROVED" ? (
          <div className="phonepe-payment-approved" role="status">
            <strong>Payment manually approved</strong>
            <p>An administrator confirmed your payment reference.</p>
          </div>
        ) : (
          <>
            {payment?.status === "REJECTED" && (
              <div className="phonepe-payment-rejected" role="status">
                <strong>Payment reference was not approved</strong>
                <p>
                  Check the reference and contact support if you believe this
                  decision is incorrect.
                </p>
              </div>
            )}

            {!orderId ? (
              <p className="phonepe-payment-error" role="alert">
                An order must be created before submitting payment details.
              </p>
            ) : (
              <form onSubmit={handlePaymentSubmitted}>
                <label
                  htmlFor="paymentReference"
                  className="phonepe-payment-label"
                >
                  UPI transaction reference number
                </label>

                <input
                  id="paymentReference"
                  type="text"
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  placeholder="Enter reference number"
                  className="phonepe-payment-input"
                  minLength={6}
                  maxLength={100}
                  pattern="[A-Za-z0-9-]{6,100}"
                  title="Use 6–100 letters, numbers, or hyphens."
                  required
                />

                <button
                  type="submit"
                  className="phonepe-payment-button"
                  disabled={submitting}
                >
                  {submitting
                    ? "Submitting..."
                    : payment?.status === "REJECTED"
                      ? "Resubmit payment reference"
                      : "I have made the payment"}
                </button>
              </form>
            )}
          </>
        )}

        {error && (
          <p className="phonepe-payment-error" role="alert">
            {error}
          </p>
        )}

        <p className="phonepe-payment-footer">
          Never share your UPI PIN or OTP.
        </p>
      </div>
    </div>
  );
}

export default PhonePePayment;
