## equations is a named vector
evaluate <-function(expr,equations) {
    for(n in names(equations))
        do.call(delayedAssign,
                list(n,
                     substitute(eval(parse(text=equations[[n]])),
                                list(n=n,equations=equations))
                     ))
    eval(parse(text=expr))
}
