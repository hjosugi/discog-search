// 入力フィールドコンポーネント
<<<<<<< HEAD
import type { ChangeEventHandler } from "react"

interface InputFieldProps {
  value: string
  onChange: ChangeEventHandler<HTMLInputElement>
||||||| e3e4796
export function InputField({ value, onChange, placeholder, onClear }: any) {
=======
interface InputFieldProps {
  value: string
  onChange: React.ChangeEventHandler<HTMLInputElement>
>>>>>>> origin/codex/add-musician-information-feature
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
        ✖️
      </button>
    </div>
  )
}
