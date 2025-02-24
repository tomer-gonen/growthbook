import Link from "next/link";
import {
  ExperimentInterfaceStringDates,
  LegacyVariation,
  Variation,
} from "back-end/types/experiment";
import {
  VisualChangesetInterface,
  VisualChangesetURLPattern,
} from "back-end/types/visual-changeset";
import React, { FC, Fragment, useState } from "react";
import { FaPlusCircle, FaTimesCircle } from "react-icons/fa";
import { useAuth } from "@/services/auth";
import { useUser } from "@/services/UserContext";
import DeleteButton from "@/components/DeleteButton/DeleteButton";
import Tooltip from "@/components/Tooltip/Tooltip";
import track from "@/services/track";
import { appendQueryParamsToURL } from "@/services/utils";
import PremiumTooltip from "@/components/Marketing/PremiumTooltip";
import Carousel from "../Carousel";
import ScreenshotUpload from "../EditExperiment/ScreenshotUpload";
import { GBEdit } from "../Icons";
import OpenVisualEditorLink from "../OpenVisualEditorLink";
import VisualChangesetModal from "./VisualChangesetModal";

interface Props {
  experiment: ExperimentInterfaceStringDates;
  visualChangesets: VisualChangesetInterface[];
  mutate: () => void;
  canEdit: boolean;
  className?: string;
  setVisualEditorModal: (v: boolean) => void;
}

const ScreenshotCarousel: FC<{
  index: number;
  variation: Variation;
  canEdit: boolean;
  experiment: ExperimentInterfaceStringDates;
  mutate: () => void;
}> = ({ canEdit, experiment, index, variation, mutate }) => {
  const { apiCall } = useAuth();

  return (
    <Carousel
      // @ts-expect-error TS(2322) If you come across this, please fix it!: Type '((j: number) => Promise<void>) | null' is no... Remove this comment to see the full error message
      deleteImage={
        !canEdit
          ? null
          : async (j) => {
              const { status, message } = await apiCall<{
                status: number;
                message?: string;
              }>(`/experiment/${experiment.id}/variation/${index}/screenshot`, {
                method: "DELETE",
                body: JSON.stringify({
                  url: variation.screenshots[j].path,
                }),
              });

              if (status >= 400) {
                throw new Error(
                  message || "There was an error deleting the image"
                );
              }

              mutate();
            }
      }
    >
      {variation.screenshots.map((s) => (
        <img
          className="experiment-image"
          key={s.path}
          src={s.path}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            filter: "drop-shadow(0px 4px 15px rgba(0, 0, 0, 0.12))",
          }}
        />
      ))}
    </Carousel>
  );
};

const isLegacyVariation = (v: Partial<LegacyVariation>): v is LegacyVariation =>
  // @ts-expect-error TS(2532) If you come across this, please fix it!: Object is possibly 'undefined'.
  !!v.css || v.dom?.length > 0;

const drawUrlPattern = (
  p: VisualChangesetURLPattern,
  j: number,
  total: number
) => (
  <span key={j}>
    <code>{p.pattern}</code>
    {p.include === false && (
      <Tooltip body="Exclude this pattern" style={{ marginLeft: 2 }}>
        <FaTimesCircle className="mt-1" color={"#e53"} />
      </Tooltip>
    )}
    {j < total - 1 && <span className="mx-1">, </span>}
  </span>
);

const VariationsTable: FC<Props> = ({
  experiment,
  canEdit,
  mutate,
  visualChangesets: _visualChangesets,
  setVisualEditorModal,
}) => {
  const { variations } = experiment;
  const { apiCall } = useAuth();

  const { hasCommercialFeature } = useUser();
  const hasVisualEditorFeature = hasCommercialFeature("visual-editor");

  const visualChangesets = _visualChangesets || [];
  const hasAnyPositionMutations = visualChangesets.some((vc) =>
    vc.visualChanges.some(
      (v) => v.domMutations.filter((m) => m.attribute === "position").length > 0
    )
  );

  const [
    editingVisualChangeset,
    setEditingVisualChangeset,
  ] = useState<VisualChangesetInterface | null>(null);

  const hasDescriptions = variations.some((v) => !!v.description?.trim());
  const hasUniqueIDs = variations.some((v, i) => v.key !== i + "");
  const hasLegacyVisualChanges = variations.some((v) => isLegacyVariation(v));

  return (
    <div className="w-100">
      <div
        className="w-100 mb-4 fade-mask-1rem"
        style={{
          overflowX: "auto",
        }}
      >
        <table className="table table-bordered mx-3 w100-1rem">
          <thead>
            <tr>
              {variations.map((v, i) => (
                <th
                  key={i}
                  className={`variation with-variation-label variation${i} ${
                    !(hasDescriptions || hasUniqueIDs)
                      ? "with-variation-border-bottom"
                      : "pb-2"
                  }`}
                  style={{
                    // @ts-expect-error TS(2322) If you come across this, please fix it!: Type 'number | null' is not assignable to type 'Bo... Remove this comment to see the full error message
                    borderBottom: hasDescriptions || hasUniqueIDs ? 0 : null,
                  }}
                >
                  <span className="label">{i}</span>
                  <span className="name">{v.name}</span>
                </th>
              ))}
            </tr>
            {(hasDescriptions || hasUniqueIDs) && (
              <tr>
                {variations.map((v, i) => (
                  <td
                    className={`variation with-variation-border-bottom variation${i} pt-0 pb-1 align-bottom`}
                    style={{ borderTop: 0 }}
                    key={i}
                    scope="col"
                  >
                    {hasDescriptions && <div>{v.description}</div>}
                    {hasUniqueIDs && <code className="small">ID: {v.key}</code>}
                  </td>
                ))}
              </tr>
            )}
          </thead>

          <tbody>
            <tr>
              {variations.map((v, i) => (
                <td
                  key={i}
                  scope="col"
                  className={`align-top ${canEdit ? "pb-1" : ""}`}
                  style={{
                    minWidth: "17.5rem",
                    height: "inherit",
                    // @ts-expect-error TS(2322) If you come across this, please fix it!: Type 'number | null' is not assignable to type 'Bo... Remove this comment to see the full error message
                    borderBottom: canEdit ? 0 : null,
                  }}
                >
                  <div className="d-flex flex-column h-100">
                    {v.screenshots.length > 0 ? (
                      <ScreenshotCarousel
                        key={i}
                        index={i}
                        variation={v}
                        canEdit={canEdit}
                        experiment={experiment}
                        mutate={mutate}
                      />
                    ) : null}
                  </div>
                </td>
              ))}
            </tr>
            {canEdit && (
              <tr>
                {variations.map((v, i) => (
                  <td
                    key={`b${i}`}
                    className="pt-0 pb-1"
                    style={{ borderTop: 0 }}
                  >
                    <div>
                      <ScreenshotUpload
                        variation={i}
                        experiment={experiment.id}
                        onSuccess={() => mutate()}
                      />
                    </div>
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {visualChangesets.length > 0 && (
        <div>
          <div className="px-3 mb-3">
            <div className="h3 d-inline-block my-0 align-middle">
              Visual Changes
            </div>

            {hasAnyPositionMutations && (
              <div className="small text-muted">
                This experiment requires at least version 0.26.0 of our
                Javascript SDK
              </div>
            )}
          </div>

          {visualChangesets.map((vc, i) => {
            const simpleUrlPatterns = vc.urlPatterns
              .filter((v) => v.type === "simple")
              .sort((v) => (v.include === false ? 1 : -1));
            const regexUrlPatterns = vc.urlPatterns
              .filter((v) => v.type === "regex")
              .sort((v) => (v.include === false ? 1 : -1));

            const onlySimpleRules =
              simpleUrlPatterns.length > 0 && regexUrlPatterns.length === 0;

            return (
              <Fragment key={i}>
                <div
                  className={`${
                    i !== 0 && "mt-2"
                  } appbox bg-light py-2 mx-3 mb-4 `}
                >
                  <div className="px-3">
                    <div className="row mt-1 mb-3 d-flex align-items-end">
                      <div className="col">
                        <div className="col-auto px-3 py-2 rounded bg-muted-yellow">
                          <label className="d-block mb-1 font-weight-bold">
                            URL Targeting
                            {canEdit && (
                              <a
                                className="ml-2"
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setEditingVisualChangeset(vc);
                                  track("Open visual editor modal", {
                                    source: "visual-editor-ui",
                                    action: "edit",
                                  });
                                }}
                              >
                                <GBEdit />
                              </a>
                            )}
                          </label>
                          {simpleUrlPatterns.length > 0 && (
                            <>
                              {!onlySimpleRules && (
                                <div className="uppercase-title mt-1">
                                  Simple:
                                </div>
                              )}
                              {simpleUrlPatterns.map((p, j) =>
                                drawUrlPattern(p, j, vc.urlPatterns.length)
                              )}
                            </>
                          )}
                          {regexUrlPatterns.length > 0 && (
                            <>
                              <div className="uppercase-title mt-1">Regex:</div>
                              {regexUrlPatterns.map((p, j) =>
                                drawUrlPattern(p, j, vc.urlPatterns.length)
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <div style={{ flex: 1 }} />
                      {canEdit && experiment.status === "draft" && (
                        <div className="col-auto">
                          {hasVisualEditorFeature && (
                            <OpenVisualEditorLink
                              id={vc.id}
                              changeIndex={1}
                              visualEditorUrl={vc.editorUrl}
                            />
                          )}
                          <DeleteButton
                            className="btn-sm ml-4"
                            onClick={async () => {
                              await apiCall(`/visual-changesets/${vc.id}`, {
                                method: "DELETE",
                              });
                              mutate();
                              track("Delete visual changeset", {
                                source: "visual-editor-ui",
                              });
                            }}
                            displayName="Visual Changes"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    className="w-100 fade-mask-1rem"
                    style={{
                      overflowX: "auto",
                    }}
                  >
                    <table
                      className="table table-borderless mx-3 my-0 w100-1rem"
                      style={{ tableLayout: "fixed" }}
                    >
                      <thead>
                        <tr>
                          {variations.map((v, i) => (
                            <th
                              key={i}
                              className={`py-2 variation with-variation-label variation${i} with-variation-border-bottom`}
                              style={{ borderBottomWidth: 3, width: "10rem" }}
                            >
                              <span className="label">{i}</span>
                              <span className="name">{v.name}</span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          {variations.map((_v, j) => {
                            const changes = vc.visualChanges[j];
                            const numChanges =
                              (changes?.css ? 1 : 0) +
                              (changes?.domMutations?.length || 0);
                            return (
                              <td key={j} className="px-4 py-1">
                                <div className="d-flex justify-content-between">
                                  <div>
                                    {numChanges} visual change
                                    {numChanges === 1 ? "" : "s"}
                                  </div>
                                  <div>
                                    <a
                                      target="_blank"
                                      rel="noreferrer"
                                      href={appendQueryParamsToURL(
                                        vc.editorUrl,
                                        {
                                          [experiment.trackingKey]: j,
                                        }
                                      )}
                                    >
                                      Preview
                                    </a>
                                  </div>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </Fragment>
            );
          })}

          <div className="px-3 my-2">
            {hasVisualEditorFeature && canEdit ? (
              <button
                className="btn btn-link"
                onClick={() => {
                  setVisualEditorModal(true);
                  track("Open visual editor modal", {
                    source: "visual-editor-ui",
                    action: "add",
                  });
                }}
              >
                <FaPlusCircle /> Add Visual Editor page
              </button>
            ) : (
              <PremiumTooltip commercialFeature={"visual-editor"}>
                <div className="btn btn-link disabled">
                  <FaPlusCircle /> Add Visual Editor page
                </div>
              </PremiumTooltip>
            )}
          </div>
        </div>
      )}

      {editingVisualChangeset ? (
        <VisualChangesetModal
          mode="edit"
          experiment={experiment}
          visualChangeset={editingVisualChangeset}
          mutate={mutate}
          close={() => setEditingVisualChangeset(null)}
        />
      ) : null}

      {hasLegacyVisualChanges && (
        <div className="alert alert-warning mt-3">
          <Link href={`/experiments/designer/${experiment.id}`}>
            Open Legacy Visual Editor
          </Link>
        </div>
      )}
    </div>
  );
};

export default VariationsTable;
