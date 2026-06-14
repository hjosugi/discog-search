import { Spinner as FluentUISpinner } from "@fluentui/react"
export function Spinner() {
  return (
    <div className="flex justify-center mt-5">
      <FluentUISpinner label="Searching..." />
    </div>
  )
}
