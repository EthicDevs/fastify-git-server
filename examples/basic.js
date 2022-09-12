"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var fastify_1 = tslib_1.__importDefault(require("fastify"));
var node_path_1 = require("node:path");
var __1 = tslib_1.__importStar(require(".."));
function main() {
    return tslib_1.__awaiter(this, void 0, void 0, function () {
        var server;
        return tslib_1.__generator(this, function (_a) {
            server = (0, fastify_1.default)();
            server.register(__1.default, {
                // can be set to a path to git, else will directly call "git" from $PATH.
                gitExecutablePath: undefined,
                // a method to authorise the fact that the user can fetch/push, or not.
                authorize: function (repoSlug, credentials) {
                    return tslib_1.__awaiter(this, void 0, void 0, function () {
                        return tslib_1.__generator(this, function (_a) {
                            console.log("[authorize] repoSlug: ".concat(repoSlug, ", username: ").concat(credentials.username, ", password: ").concat(credentials.password));
                            if (repoSlug.toLowerCase() === "testorg/testrepo") {
                                return [2 /*return*/, (credentials.username === "test" && credentials.password === "test")];
                            }
                            return [2 /*return*/, false];
                        });
                    });
                },
                // a method to resolve the repository directory on disk and its authorisation mode.
                repositoryResolver: function (repoSlug) {
                    return tslib_1.__awaiter(this, void 0, void 0, function () {
                        return tslib_1.__generator(this, function (_a) {
                            console.log("[repositoryResolver] repoSlug: ".concat(repoSlug));
                            if (repoSlug !== "testorg/testrepo") {
                                throw new Error("Cannot find such repository.");
                            }
                            return [2 /*return*/, {
                                    authMode: __1.GitServer.AuthMode.ALWAYS,
                                    gitRepositoryDir: (0, node_path_1.resolve)((0, node_path_1.join)(__dirname, "..")),
                                }];
                        });
                    });
                },
            });
            server.listen(4200, "localhost", function (err, address) {
                if (err != null) {
                    console.error("Could not start server. Error: ".concat(err.message));
                }
                else {
                    console.log("Server is up and running at ".concat(address));
                }
            });
            return [2 /*return*/, server];
        });
    });
}
main();
