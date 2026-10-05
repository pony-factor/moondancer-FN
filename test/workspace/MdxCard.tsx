import * as React from 'react';

export function DemoCard({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border p-4">
      <h3>{title}</h3>
      <div>{children}</div>
    </section>
  );
}
