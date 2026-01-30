/**
 * @file mod/github_adapter_schema.js
 * @summary Proposed schema definition for the GitHub Adapter.
 * @description This file provides the canonical schema for data fetched from the GitHub API.
 * The GitHubAdapter is responsible for fetching data and the GitHubMapper is responsible for
 * transforming it into entities and relations that conform to this schema.
 * See: doc/modules/adapter/GitHub/Schema.md
 */

/**
 * @const {object} GitHubSchema
 * @description The schema definition for the GitHub adapter.
 */
export const GitHubSchema = {
    id: "schema.github.v1",
    version: "1.0.0",

    entities: {
        account: {
            description: "GitHub user or organization",
            requiredMetadata: ["title"],
        },
        repository: {
            description: "A git repository",
            requiredMetadata: ["title"],
            optionalMetadata: ["description", "archived", "size"],
        },
        branch: {
            description: "A git branch",
            requiredMetadata: ["title"],
        },
        commit: {
            description: "A git commit object",
            requiredMetadata: ["title"],
        },
        directory: {
            description: "A folder within a repository",
            requiredMetadata: ["title"],
        },
        file: {
            description: "A file within a repository",
            requiredMetadata: ["title"],
            optionalMetadata: ["size"],
        },
        pull_request: {
            description: "A pull request",
            requiredMetadata: ["title"],
            optionalMetadata: ["state"],
        },
        collaborator: {
            description: "A user with access to a repository",
            requiredMetadata: ["title"],
        },
    },

    relations: {
        OWNS: {
            from: "account",
            to: "repository",
            description: "Indicates ownership of a repository by a user or organization.",
        },
        HAS_BRANCH: {
            from: "repository",
            to: "branch",
            description: "Connects a repository to its branches.",
        },
        DEFAULT_BRANCH: {
            from: "repository",
            to: "branch",
            cardinality: "one-to-one",
            description: "Identifies the default branch of a repository.",
        },
        CONTAINS: {
            from: ["repository", "directory"],
            to: ["directory", "file"],
            description: "Represents the file system hierarchy.",
        },
        COMMITTED_TO: {
            from: "commit",
            to: "branch",
            description: "Indicates which branch a commit belongs to.",
        },
        CREATED_BY: {
            from: ["commit", "pull_request"],
            to: "collaborator",
            description: "Indicates the author of a commit or pull request.",
        },
        MERGES_INTO: {
            from: "pull_request",
            to: "branch",
            description: "Indicates the target branch for a pull request.",
        },
    },
};
