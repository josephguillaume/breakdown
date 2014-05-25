univariateCrossover <-
function(equations.scen,equations.baseline,var,ranges){
    ranges=as.data.frame(ranges)
    stopifnot(all(c("Variable","Lower","Upper") %in% names(ranges)))
    
    ## Get functions for each scenario
    f.scen=evalTermsFun(equations.scen,var,subset.args=FALSE)
    f.baseline=evalTermsFun(equations.baseline,var,subset.args=FALSE)
    
    pts <- sapply(ranges$Variable,function(v){
        ranges0 <- subset(ranges,Variable==v)
        f.diff <- createDiffFun(f.scen,f.baseline,ranges0$Variable,fixed.vals=NULL)
        ## TODO don't hide all errors
        tryCatch(return(uniroot(f.diff,interval=c(ranges0$Lower,ranges0$Upper))$root),error=function(e) return(NA))
    })
    return(pts)
}
