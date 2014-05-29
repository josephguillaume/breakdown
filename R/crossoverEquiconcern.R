crossoverEquiconcern=function(equations.scen, equations.baseline, var, ranges){
  ranges=as.data.frame(ranges)
  stopifnot(all(c("Variable","Lower","Min","Best","Max","Upper") %in% names(ranges)))
  
  ## Get functions for each scenario
  f.scen=evalTermsFun(equations.scen,var,subset.args=FALSE)
  f.baseline=evalTermsFun(equations.baseline,var,subset.args=FALSE)
  netdiff <- createDiffFun(f.scen,f.baseline,ranges$Variable,fixed.vals=NULL)
  
  doutput=function(loc,bound){
    x=ifelse(bound<ranges$Best,
             bound+loc*(ranges$Best-bound)/100,
             bound-loc*(bound-ranges$Best)/100
    )
    netdiff(x)
  }
  ## All possible directions
  bounds<-do.call(expand.grid,lapply(apply(ranges[,c("Min","Max")],1,as.list),unlist))
  ## Identify crossover point along eacg line of equal concern
  locs=apply(bounds,1,function(bound){
    res=tryCatch(uniroot(doutput,c(0,100),bound=bound)$root,error=function(e) NA)
  })
  if(all(is.na(locs))) stop("No crossover points found")
  ## Select point of greatest concern
  w.max.loc=which.max(locs)
  loc=locs[w.max.loc]
  bound=as.numeric(bounds[w.max.loc,])
  names(bound)<-ranges$Variable
  x=ifelse(bound<ranges$Best,
           bound+loc*(ranges$Best-bound)/100,
           bound-loc*(bound-ranges$Best)/100
  )
  names(x)<-ranges$Variable
  list(loc=loc,
       bound=bound,
       doutput=doutput(loc,bound=bound),
       values=x
  )
}
