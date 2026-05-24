import { useState } from "react";

export default function useFormState(initialState) {
  const [form, setForm] = useState(initialState);

  const updateField = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = (nextState = initialState) => {
    setForm(nextState);
  };

  return {
    form,
    setForm,
    updateField,
    resetForm,
  };
}