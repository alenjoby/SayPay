import React from 'react';

interface LiveAnnouncerProps {
  politeMessage: string;
  alertMessage: string;
}

/**
 * Screen Reader Live Announcer adhering to W3C ARIA specifications.
 * Ensures blind users receive instant verbal announcements for every UI & blockchain state change.
 */
export const LiveAnnouncer: React.FC<LiveAnnouncerProps> = ({ politeMessage, alertMessage }) => {
  return (
    <div className="sr-only" aria-hidden="false">
      {/* Polite region for normal status updates (e.g. balance loaded, action identified) */}
      <div
        id="saypay-polite-announcer"
        aria-live="polite"
        aria-atomic="true"
        role="status"
      >
        {politeMessage}
      </div>

      {/* Assertive alert region for security-critical events (e.g. recovery started, errors) */}
      <div
        id="saypay-alert-announcer"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        {alertMessage}
      </div>
    </div>
  );
};
