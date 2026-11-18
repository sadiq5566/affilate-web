'use client';

export default function Error({ reset }) {
  return (
    <div className="container page center">
      <h1>Something went wrong</h1>
      <p className="lead">We could not load the offers right now. Please try again in a moment.</p>
      <button className="btn btn--primary" onClick={() => reset()}>Try again</button>
    </div>
  );
}
