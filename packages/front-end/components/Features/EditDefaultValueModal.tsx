import { useForm } from "react-hook-form";
import { FeatureInterface } from "back-end/types/feature";
import { useAuth } from "@/services/auth";
import {
  getFeatureDefaultValue,
  validateFeatureValue,
} from "@/services/features";
import Modal from "../Modal";
import FeatureValueField from "./FeatureValueField";

export interface Props {
  feature: FeatureInterface;
  close: () => void;
  mutate: () => void;
}

export default function EditDefaultValueModal({
  feature,
  close,
  mutate,
}: Props) {
  const form = useForm({
    defaultValues: {
      defaultValue: getFeatureDefaultValue(feature),
    },
  });
  const { apiCall } = useAuth();

  return (
    <Modal
      header="Edit Default Value"
      submit={form.handleSubmit(async (value) => {
        const newDefaultValue = validateFeatureValue(
          feature.valueType,
          // @ts-expect-error TS(2345) If you come across this, please fix it!: Argument of type 'string | undefined' is not assig... Remove this comment to see the full error message
          value.defaultValue,
          ""
        );
        if (newDefaultValue !== value.defaultValue) {
          form.setValue("defaultValue", newDefaultValue);
          throw new Error(
            "We fixed some errors in the value. If it looks correct, submit again."
          );
        }

        await apiCall(`/feature/${feature.id}/defaultvalue`, {
          method: "POST",
          body: JSON.stringify(value),
        });
        mutate();
      })}
      close={close}
      open={true}
    >
      <div className="alert alert-info">
        Changes here will be added to a draft revision. You will have a chance
        to review it before making it live.
      </div>
      <FeatureValueField
        label="Value When Enabled"
        id="defaultValue"
        // @ts-expect-error TS(2322) If you come across this, please fix it!: Type 'string | undefined' is not assignable to typ... Remove this comment to see the full error message
        value={form.watch("defaultValue")}
        setValue={(v) => form.setValue("defaultValue", v)}
        valueType={feature.valueType}
      />
    </Modal>
  );
}
