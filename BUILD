load("@npm_bazel_typescript//:index.bzl", "ts_library")
load("@build_bazel_rules_nodejs//:index.bzl", "nodejs_binary")

ts_library(
    name = "transport",
    srcs = glob(["src/*.ts"]),
    deps = [
	"@npm//sip.js",
	"@npm//@types/node",
    ],
)

nodejs_binary(
    name = "server",
    data = [
        ":transport",
    ],
    entry_point = ":src/app.ts",
)
