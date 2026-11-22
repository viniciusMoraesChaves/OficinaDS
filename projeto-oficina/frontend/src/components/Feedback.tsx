type FeedbackProps = {
  type?: 'error' | 'success' | 'info' | 'loading';
  message?: string;
};

export function Feedback({ type, message }: FeedbackProps) {
  if (!message) return null;
  return (
    <p className={`feedback ${type ? `feedback--${type}` : ''}`.trim()} role="status">
      {message}
    </p>
  );
}