"""
Phase 4 — Decision Engine.

Maps a VerificationResult produced by a verifier to one of the three
final retest statuses.

Mapping logic (deliberately simple and explicit):
  verifier.success = True   → vulnerability is still exploitable → "not_fixed"
  verifier.success = False  → vulnerability appears fixed         → "verified"
  execution threw exception → something went wrong                → "failed"

The confidence score from the verifier is preserved in the final result
for transparency but does NOT affect the status decision. Keeping the
decision rule binary prevents subtle bugs from confidence thresholding.
"""

from .logger import get_logger

log = get_logger(__name__)

# Literal status strings — must match what the existing system expects
STATUS_NOT_FIXED = "not_fixed"
STATUS_VERIFIED  = "verified"
STATUS_FAILED    = "failed"


def determine_status(verification_result: dict | None, error: str | None = None) -> str:
    """
    Return the final retest status string.

    Args:
        verification_result: Dict from a verifier, or None if execution failed.
        error:               Exception message if orchestration crashed.

    Returns:
        "not_fixed" | "verified" | "failed"
    """
    if error or verification_result is None:
        log.warning(f"Decision: FAILED (execution error: {error!r})")
        return STATUS_FAILED

    success    = verification_result.get("success")
    confidence = verification_result.get("confidence", 0.0)

    if success is True:
        log.info(
            f"Decision: NOT_FIXED "
            f"(vulnerability still exploitable, confidence={confidence:.2f})"
        )
        return STATUS_NOT_FIXED

    if success is False:
        log.info(
            f"Decision: VERIFIED "
            f"(fix confirmed, confidence={confidence:.2f})"
        )
        return STATUS_VERIFIED

    # Unexpected value for `success` — treat as inconclusive
    log.warning(f"Decision: FAILED (unexpected success value: {success!r})")
    return STATUS_FAILED
