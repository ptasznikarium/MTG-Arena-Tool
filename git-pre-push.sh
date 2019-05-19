#!/bin/sh
if [ ! -f .git/hooks/pre-push ]; then
    cp ./git-pre-push.sh .git/hooks/pre-push
fi
BRANCH=$( git symbolic-ref --short -q HEAD )
REMOTE=$( git rev-parse --verify "origin/${BRANCH}" )
if [ $? -ne 0 ]
then
    REMOTE=$( git merge-base "origin/master" HEAD )
fi
date "+%Y-%m-%d %T    Comparing to ${REMOTE}"

for FILE in $( git diff --name-only "--diff-filter=ACMR" "${REMOTE}" HEAD )
do
    date "+%Y-%m-%d %T    Validating ${FILE}"

    if [[ $FILE =~ ^.+jsx?$ ]]
    then
        date "+%Y-%m-%d %T      Linting: eslint: ${FILE}"
        npx eslint "${FILE}" --quiet
        if [ $? -ne 0 ]
        then
            date "+%Y-%m-%d %T    Aborting push due to files with lint"
            exit 1
        fi
    fi
done

date "+%Y-%m-%d %T    Finished validating all changes since ${REMOTE}. LGTM!"
exit 0
