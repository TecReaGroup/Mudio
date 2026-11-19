; Registers Mudio under "Default apps" so Settings can deep-link to it (ms-settings:defaultapps?registeredAppUser=Mudio).
; ProgId must match fileAssociations[].name in package.json.
!define MUDIO_CAPABILITIES_KEY "Software\${PRODUCT_NAME}\Capabilities"
!define MUDIO_VIDEO_PROGID "Mudio.Video"

!macro customInstall
  WriteRegStr SHCTX "${MUDIO_CAPABILITIES_KEY}" "ApplicationName" "${PRODUCT_NAME}"
  WriteRegStr SHCTX "${MUDIO_CAPABILITIES_KEY}" "ApplicationDescription" "${PRODUCT_NAME} video player"
  WriteRegStr SHCTX "${MUDIO_CAPABILITIES_KEY}\FileAssociations" ".mp4" "${MUDIO_VIDEO_PROGID}"
  WriteRegStr SHCTX "${MUDIO_CAPABILITIES_KEY}\FileAssociations" ".m4v" "${MUDIO_VIDEO_PROGID}"
  WriteRegStr SHCTX "${MUDIO_CAPABILITIES_KEY}\FileAssociations" ".webm" "${MUDIO_VIDEO_PROGID}"
  WriteRegStr SHCTX "${MUDIO_CAPABILITIES_KEY}\FileAssociations" ".mkv" "${MUDIO_VIDEO_PROGID}"
  WriteRegStr SHCTX "${MUDIO_CAPABILITIES_KEY}\FileAssociations" ".mov" "${MUDIO_VIDEO_PROGID}"
  WriteRegStr SHCTX "${MUDIO_CAPABILITIES_KEY}\FileAssociations" ".ogv" "${MUDIO_VIDEO_PROGID}"
  WriteRegStr SHCTX "Software\RegisteredApplications" "${PRODUCT_NAME}" "${MUDIO_CAPABILITIES_KEY}"
!macroend

!macro customUnInstall
  DeleteRegValue SHCTX "Software\RegisteredApplications" "${PRODUCT_NAME}"
  DeleteRegKey SHCTX "Software\${PRODUCT_NAME}\Capabilities"
!macroend
