#!/bin/sh
MESSAGE="$1"
DEV_BRANCH_NAME="develop"
MASTER_BRANCH_NAME="master"
RELEASE_TYPE="major"

confirm() {
    # call with a prompt string or use a default
    read -r -p "${1:-Are you sure? [y/N]} " response
    case "$response" in
        [yY][eE][sS]|[yY]) 
            true
            ;;
        *)
            false
            ;;
    esac
}

execute() {
    if git checkout ${DEV_BRANCH_NAME} &&
        git fetch origin ${DEV_BRANCH_NAME} &&
        [ `git rev-list HEAD...origin/${DEV_BRANCH_NAME} --count` != 0 ] &&
        git merge origin/${DEV_BRANCH_NAME}
    then
        echo "Performing ${RELEASE_TYPE} release preparations..."
        if npm version ${RELEASE_TYPE} -m "Release version %s"
        then
            echo "NPM version done!"
            if git add . && 
                git push && 
                git checkout ${MASTER_BRANCH_NAME} && 
                git pull && 
                git merge ${DEV_BRANCH_NAME} && 
                git push && 
                git push --tags
            then
                echo "Changes merged to ${MASTER_BRANCH_NAME} branch and pushed to origin."
                true
            else
                echo "Failed to merge to ${MASTER_BRANCH_NAME} branch and push to origin."
                false
            fi
        else
            echo "NPM version failed!"
            false
        fi
    else
        echo "Could not prepare for new release. Please make sure the repository is up to date with the origin before you continue."
        false
    fi
}

run() {
    if confirm && execute
    then
        echo "Successfully completed!"
    else
        echo "Failed to complete!"
    fi
}

run
