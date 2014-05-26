bivariateCrossover <-
  function(equations.scen,equations.baseline,var,ranges,n=100){
    ranges=as.data.frame(ranges)
    stopifnot(all(c("Variable","Lower","Upper") %in% names(ranges)))
    stopifnot(nrow(ranges)==2)
    
    ## Get functions for each scenario
    f.scen=evalTermsFun(equations.scen,var,subset.args=FALSE)
    f.baseline=evalTermsFun(equations.baseline,var,subset.args=FALSE)
    
    netdiff <- createDiffFun(f.scen,f.baseline,ranges$Variable,fixed.vals=NULL)
    xs<-rep(NA,n)
    ys=seq(ranges$Lower[2],ranges$Upper[2],length.out=n)
    for(i in 1:n){
      xs[i] <- tryCatch(uniroot(function(x) netdiff(c(x,ys[i])),
                                interval=c(ranges$Lower[1],ranges$Upper[1]))$root,
                        error=function(e) return(NA))
    }
    mm <- cbind(xs,ys)
    colnames(mm) <- ranges$Variable
    mm
  }
