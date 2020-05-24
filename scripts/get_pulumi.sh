#!/bin/bash

# This is a fork of the original install script at https://get.pulumi.com/. It skips the otherwise hard-coded messing
# with the $PATH variable, which we do not need for a dedicated install that is wrapped by meteor-deploy.

set -e

RESET="\\033[0m"
RED="\\033[31;1m"
GREEN="\\033[32;1m"
YELLOW="\\033[33;1m"
BLUE="\\033[34;1m"
WHITE="\\033[37;1m"

print_unsupported_platform()
{
    >&2 say_red "error: We're sorry, but it looks like Pulumi is not supported on your platform"
    >&2 say_red "       We support 64-bit versions of Linux and macOS and are interested in supporting"
    >&2 say_red "       more platforms.  Please open an issue at https://github.com/pulumi/pulumi and"
    >&2 say_red "       let us know what platform you're using!"
}

say_green()
{
    printf "%b%s%b\\n" "${GREEN}" "$1" "${RESET}"
}

say_red()
{
    printf "%b%s%b\\n" "${RED}" "$1" "${RESET}"
}

say_yellow()
{
    printf "%b%s%b\\n" "${YELLOW}" "$1" "${RESET}"
}

say_blue()
{
    printf "%b%s%b\\n" "${BLUE}" "$1" "${RESET}"
}

say_white()
{
    printf "%b%s%b\\n" "${WHITE}" "$1" "${RESET}"
}

at_exit()
{
    if [ "$?" -ne 0 ]; then
        >&2 say_red
        >&2 say_red "We're sorry, but it looks like something might have gone wrong during installation."
        >&2 say_red "If you need help, please join us on https://slack.pulumi.com/"
    fi
}

trap at_exit EXIT

VERSION=""
if [ "$1" = "--version" ] && [ "$2" != "latest" ]; then
    VERSION=$2
else
    if ! VERSION=$(curl --fail --silent -L "https://www.pulumi.com/latest-version"); then
        >&2 say_red "error: could not determine latest version of Pulumi, try passing --version X.Y.Z to"
        >&2 say_red "       install an explicit version"
        exit 1
    fi
fi

OS=""
case $(uname) in
    "Linux") OS="linux";;
    "Darwin") OS="darwin";;
    *)
        print_unsupported_platform
        exit 1
        ;;
esac

if [ "$(uname -m)" != "x86_64" ]; then
        print_unsupported_platform
        exit 1
fi

TARBALL_URL="https://get.pulumi.com/releases/sdk/pulumi-v${VERSION}-${OS}-x64.tar.gz"

if ! command -v $HOME/pulumi/bin/pulumi >/dev/null; then
    say_blue "=== Installing Pulumi v${VERSION} ==="
else
    say_blue "=== Upgrading Pulumi $($HOME/pulumi/bin/pulumi version) to v${VERSION} ==="
fi

say_white "+ Downloading ${TARBALL_URL}..."

TARBALL_DEST=$(mktemp -t pulumi.tar.gz.XXXXXXXXXX)

if curl --fail -L -o "${TARBALL_DEST}" "${TARBALL_URL}"; then
    say_white "+ Extracting to $HOME/pulumi/bin"

    # If `~/pulumi/bin exists, clear it out
    if [ -e "${HOME}/pulumi/bin" ]; then
        rm -rf "${HOME}/pulumi/bin"
    fi

    mkdir -p "${HOME}/pulumi"

    # Yarn's shell installer does a similar dance of extracting to a temp
    # folder and copying to not depend on additional tar flags
    EXTRACT_DIR=$(mktemp -d pulumi.XXXXXXXXXX)
    tar zxf "${TARBALL_DEST}" -C "${EXTRACT_DIR}"

    # Our tarballs used to have a top level bin folder, so support that older
    # format if we detect it. Newer tarballs just have all the binaries in
    # the top level Pulumi folder.
    if [ -d "${EXTRACT_DIR}/pulumi/bin" ]; then
        mv "${EXTRACT_DIR}/pulumi/bin" "${HOME}/pulumi/"
    else
        cp -r "${EXTRACT_DIR}/pulumi/." "${HOME}/pulumi/bin/"
    fi

    rm -f "${TARBALL_DEST}"
    rm -rf "${EXTRACT_DIR}"
else
    >&2 say_red "error: failed to download ${TARBALL_URL}"
    exit 1
fi
