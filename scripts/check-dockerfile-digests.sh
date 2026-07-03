#!/usr/bin/env bash
# Compare digest-pinned base images in a Dockerfile against registry tags via skopeo.
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: check-dockerfile-digests.sh [OPTIONS] DOCKERFILE

Check digest-pinned base images in a Dockerfile against registry tags.

Options:
  -h, --help              Show this help
  --min-archs N           Minimum platform count for multi-arch (default: 2)
  --require PLATFORMS     Comma-separated required platforms (e.g. linux/amd64,linux/arm64)

Environment:
  MIN_ARCHES              Same as --min-archs
  REQUIRE_PLATFORMS       Same as --require

Requires: skopeo, jq
EOF
}

DOCKERFILE=""
MIN_ARCHES="${MIN_ARCHES:-2}"
REQUIRE_PLATFORMS="${REQUIRE_PLATFORMS:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    --min-archs) MIN_ARCHES="$2"; shift 2 ;;
    --require) REQUIRE_PLATFORMS="$2"; shift 2 ;;
    -*) echo "error: unknown option $1" >&2; exit 1 ;;
    *)
      if [[ -n "$DOCKERFILE" ]]; then
        echo "error: only one Dockerfile path allowed" >&2
        exit 1
      fi
      DOCKERFILE="$1"
      shift
      ;;
  esac
done

DOCKERFILE="${DOCKERFILE:-Dockerfile}"

if ! command -v skopeo >/dev/null 2>&1; then
  cat >&2 <<'EOF'
error: skopeo is required but not found in PATH.

Install:
  macOS:   brew install skopeo
  Fedora:  dnf install skopeo
  Ubuntu:  apt install skopeo

Skopeo reads registry auth from ~/.docker/config.json (docker login / podman login).
EOF
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "error: jq is required" >&2
  exit 1
fi

if [[ ! -f "$DOCKERFILE" ]]; then
  echo "error: Dockerfile not found: $DOCKERFILE" >&2
  exit 1
fi

COMMENT_TAG_RE='^[[:space:]]*#[[:space:]]*(.+)[[:space:]]—[[:space:]]*pin manifest list digest'

resolve_tag() {
  local image_ref="$1" prev_line="$2"

  if [[ "$image_ref" == *:* ]]; then
    echo "${image_ref##*:}"
    return 0
  fi

  if [[ "$prev_line" =~ $COMMENT_TAG_RE ]]; then
    local hinted="${BASH_REMATCH[1]}"
    if [[ "$hinted" == *:* ]]; then
      echo "${hinted##*:}"
    else
      echo "latest"
    fi
    return 0
  fi

  echo "latest"
}

image_without_tag() {
  local image_ref="$1"
  if [[ "$image_ref" == *:* ]]; then
    echo "${image_ref%%:*}"
  else
    echo "$image_ref"
  fi
}

platforms_from_raw() {
  jq -r '
    if (.manifests // .Manifests) then
      [(.manifests // .Manifests)[]
        | (.platform // .Platform)
        | select(.architecture != null and .architecture != "unknown")
        | "\(.os)/\(.architecture)"
      ] | unique | .[]
    elif (.architecture // .Architecture) then
      "\(.os // .Os)/\(.architecture // .Architecture)"
    else
      empty
    end
  '
}

is_index() {
  case "$1" in
    application/vnd.docker.distribution.manifest.list.v2+json|application/vnd.oci.image.index.v1+json)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

report_multi_arch() {
  local label="$1" raw_file="$2"
  local media_type platforms count

  media_type="$(jq -r '.mediaType // .MediaType // empty' "$raw_file")"

  if is_index "$media_type"; then
    platforms="$(platforms_from_raw < "$raw_file" | sort -u)"
    count="$(printf '%s\n' "$platforms" | sed '/^$/d' | wc -l | tr -d ' ')"
    echo "  ${label}: multi-arch yes (${count} platforms)"
    while IFS= read -r platform; do
      [[ -n "$platform" ]] && echo "    - ${platform}"
    done <<< "$platforms"

    if [[ "$count" -lt "$MIN_ARCHES" ]]; then
      echo "  WARNING: ${label} has fewer than ${MIN_ARCHES} platforms."
      return 1
    fi
  else
    local single
    single="$(platforms_from_raw < "$raw_file" | head -n1)"
    echo "  ${label}: multi-arch no (single platform: ${single:-unknown})"
    return 1
  fi

  if [[ -n "$REQUIRE_PLATFORMS" ]]; then
    IFS=',' read -ra required <<< "$REQUIRE_PLATFORMS"
    for req in "${required[@]}"; do
      req="$(echo "$req" | xargs)"
      if ! printf '%s\n' "$platforms" | grep -qx "$req"; then
        echo "  WARNING: ${label} missing required platform: ${req}"
        return 1
      fi
    done
  fi

  return 0
}

skopeo_tag_ref() {
  local image_ref="$1" tag="$2"
  local image
  image="$(image_without_tag "$image_ref")"
  echo "docker://${image}:${tag}"
}

skopeo_digest_ref() {
  local image_ref="$1" digest="$2"
  echo "docker://$(image_without_tag "$image_ref")@${digest}"
}

skopeo_digest() {
  # Override host OS/arch so multi-arch tags resolve to the manifest-list digest on macOS too.
  skopeo inspect "$1" \
    --override-os linux \
    --override-arch amd64 \
    --format '{{.Digest}}'
}

skopeo_raw_to_file() {
  local dest="$1"
  skopeo inspect --raw "$2" > "$dest"
}

exit_code=0
seen=()
prev_line=""

while IFS= read -r line || [[ -n "$line" ]]; do
  if [[ "$line" =~ ^FROM[[:space:]]+([^[:space:]]+)@sha256:([a-f0-9]{64}) ]]; then
    image_ref="${BASH_REMATCH[1]}"
    pinned="sha256:${BASH_REMATCH[2]}"

    if [[ " ${seen[*]:-} " == *" ${image_ref} "* ]]; then
      prev_line="$line"
      continue
    fi
    seen+=("$image_ref")

    tag="$(resolve_tag "$image_ref" "$prev_line")"
    tag_ref="$(skopeo_tag_ref "$image_ref" "$tag")"
    digest_ref="$(skopeo_digest_ref "$image_ref" "$pinned")"

    echo "==> ${image_ref} (tag: ${tag})"
    echo "    pinned: ${pinned}"

    latest_digest="$(skopeo_digest "$tag_ref")"
    echo "    latest: ${latest_digest}"

    latest_raw="$(mktemp)"
    pinned_raw="$(mktemp)"
    skopeo_raw_to_file "$latest_raw" "$tag_ref"
    skopeo_raw_to_file "$pinned_raw" "$digest_ref"

    if [[ "$pinned" == "$latest_digest" ]]; then
      echo "    status: OK"
    else
      echo "    status: OUTDATED"
      echo
      echo "  Suggestion — update Dockerfile pin to latest multi-arch manifest list:"
      echo "    FROM ${image_ref}@${latest_digest}"
      echo
      exit_code=1
    fi

    report_multi_arch "Pinned digest" "$pinned_raw" || exit_code=1
    report_multi_arch "Latest tag" "$latest_raw" || exit_code=1

    rm -f "$latest_raw" "$pinned_raw"
    echo
  fi
  prev_line="$line"
done < "$DOCKERFILE"

if [[ "${#seen[@]}" -eq 0 ]]; then
  echo "error: no digest-pinned FROM lines in ${DOCKERFILE}" >&2
  exit 1
fi

exit "$exit_code"
