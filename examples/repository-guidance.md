# Example repository guidance

This is a synthetic example of a small product's existing instructions. It is not a required template
or a set of files to generate in every repository.

> Use the installed Zoo entrypoint for the requested task. For API changes, read our access contract
> and owning handler/store. For UI changes, start with the relevant component and family examples.
> Add runtime acceptance only when the claim needs running behavior or persisted results.
>
> Our access contract defines organization-wide administrators and project-scoped contributors.
> Check the current role and exact resource at reads, writes and recovery using the server's scope.
>
> Our stock list is a dense operations surface; our public catalog is an editorial browsing surface.
> Both use the same token source, but their layout and primary decisions differ. Component examples
> identify the accepted hierarchy, keyboard behavior and narrow-screen transformation.
>
> A status check reads the original attempt. It does not submit another command. Keep uncertain
> results visible and preserve work until the authoritative outcome is known.
>
> Component tests substitute the store. The local integration runner uses a fresh database and no
> external services. Neither proves real delivery. Use the owning workflow's verification instructions
> and record missing evidence.

In a real repository, link those contracts, component examples and runners to their actual paths.
Keep descriptions short and let source and scoped references supply detail.
