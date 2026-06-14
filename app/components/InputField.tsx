import type { ChangeEventHandler } from "react"

interface InputFieldProps {
  value: string
  onChange: ChangeEventHandler<HTMLInputElement>
  placeholder: string
  onClear: () => void
}

export function InputField({
  value,
  onChange,
  placeholder,
  onClear,
}: InputFieldProps) {
  return (
    <div className="mb-3 flex items-center">
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="flex-grow p-2 border border-gray-300 rounded-md bg-white text-black"
      />
      <button type="button" onClick={onClear} className="ml-2 text-gray-600">
        Clear
      </button>
    </div>
  )
}
