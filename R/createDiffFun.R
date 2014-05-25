
createDiffFun <- function(f.scen,f.baseline,par.names,fixed.vals=NULL){
  ## TODO check valid pars in par.names,fixed.vals
  ## Code to fix parameters
  if (!is.null(fixed.vals)){
    fixed.vals2 <- paste(sapply(1:length(fixed.vals),
                                function(i) sprintf("pars$%s <- %s",
                                                    names(fixed.vals)[i], fixed.vals[[i]])), collapse = "\n    ")
  } else {
    fixed.vals2 <- ""
  }
  ## Code to set values
  settings <- paste(sapply(1:length(par.names), 
                           function(i) sprintf("pars$%s <- x[%d]",
                                               par.names[i], i)), collapse = "\n    ")
  ## Create and return function
  ## Uses orig.pars, f.scen, f.baseline from here (its parent environment)
  eval(parse(text = sprintf("
  function(x){
    x<-as.numeric(x)
    orig.pars <- as.list(eval(formals(f.scen)))
    pars <- orig.pars
    %s
    %s
    s=do.call(f.scen,pars[names(orig.pars)])
    orig.pars <- as.list(eval(formals(f.baseline)))
    pars <- orig.pars
    %s
    %s
    b=do.call(f.baseline,pars[names(orig.pars)])
    diff=s-b
    stopifnot(!is.na(diff))
    diff
  }",fixed.vals2, settings,fixed.vals2, settings
  )))
}